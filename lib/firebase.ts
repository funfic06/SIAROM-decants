import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, writeBatch, type Unsubscribe } from "firebase/firestore";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzrmQ5YK3aaxek0xVclp9vxYSEX7NlUag",
  authDomain: "siarom-decantshop.firebaseapp.com",
  projectId: "siarom-decantshop",
  storageBucket: "siarom-decantshop.firebasestorage.app",
  messagingSenderId: "314998046955",
  appId: "1:314998046955:web:bd995a0ddb5e85fe4cfeae",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const catalogRef = doc(firestore, "dados", "principal");
export const ordersRef = collection(firestore, "pedidos");
export const apcStatusRef = collection(firestore, "apcStatus");
export const stockStatusRef = collection(firestore, "stockStatus");

export type CatalogDocument = { perfumes: Record<string, unknown>[]; updatedAt?: string };
export type CustomerOrder = {
  id?: string;
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volumeMl: number;
  quantity: number;
  unitPrice: number;
  customerName: string;
  contact: string;
  payment: string;
  status: "novo" | "confirmado" | "separado" | "entregue" | "cancelado";
  createdAt: string;
  source: "catalogo";
  legacyRef?: string;
  isApc?: boolean;
};
export type ApcStatus = { perfumeId: string; reserved: boolean; orderId: string; volumeMl?: number; reservedAt: string };
export type StockStatus = { perfumeId: string; reservedMl: number; lastOrderId?: string; updatedAt: string };

export function subscribeCatalog(onData: (data: CatalogDocument, fromServer: boolean) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(catalogRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() as CatalogDocument : { perfumes: [] };
    onData({ perfumes: Array.isArray(data.perfumes) ? data.perfumes : [] }, !snapshot.metadata.hasPendingWrites);
  }, onError);
}

export function subscribeAuth(onUser: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(firebaseAuth, onUser);
}

export async function signInAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signOutAdmin() {
  return signOut(firebaseAuth);
}

export async function getAdminProfile(user: User) {
  const profile = await getDoc(doc(firestore, "admins", user.uid));
  return profile.exists() && profile.data().role === "admin";
}

export function subscribeOrders(onData: (orders: CustomerOrder[], fromServer: boolean) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(ordersRef, orderBy("createdAt", "desc")), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CustomerOrder)), !snapshot.metadata.hasPendingWrites);
  }, onError);
}

export function subscribeApcStatus(onData: (status: Record<string, ApcStatus>) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(apcStatusRef, (snapshot) => {
    onData(Object.fromEntries(snapshot.docs.map((item) => [item.id, { perfumeId: item.id, ...item.data() } as ApcStatus])));
  }, onError);
}

export function subscribeStockStatus(onData: (status: Record<string, StockStatus>) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(stockStatusRef, (snapshot) => {
    onData(Object.fromEntries(snapshot.docs.map((item) => [item.id, { perfumeId: item.id, ...item.data() } as StockStatus])));
  }, onError);
}

export async function createCustomerOrder(order: Omit<CustomerOrder, "id">) {
  const orderRef = order.isApc ? doc(firestore, "pedidos", `apc-${order.perfumeId}`) : doc(ordersRef);
  const apcRef = doc(firestore, "apcStatus", order.perfumeId);
  const stockRef = doc(firestore, "stockStatus", order.perfumeId);
  return runTransaction(firestore, async (transaction) => {
    if (order.isApc) {
      const existingApc = await transaction.get(apcRef);
      if (existingApc.exists()) throw new Error("apc-limit-reached");
    }
    const stockSnapshot = await transaction.get(stockRef);
    const reservedMl = stockSnapshot.exists() ? Number(stockSnapshot.data().reservedMl) || 0 : 0;
    transaction.set(orderRef, order);
    transaction.set(stockRef, { perfumeId: order.perfumeId, reservedMl: reservedMl + ((Number(order.volumeMl) || 0) * (Number(order.quantity) || 1)), lastOrderId: orderRef.id, updatedAt: new Date().toISOString() });
    if (order.isApc) transaction.set(apcRef, { perfumeId: order.perfumeId, reserved: true, orderId: orderRef.id, volumeMl: order.volumeMl, reservedAt: new Date().toISOString() });
    return orderRef;
  });
}

export async function updateCustomerOrderStatus(orderId: string, status: CustomerOrder["status"]) {
  const orderRef = doc(firestore, "pedidos", orderId);
  const orderSnapshot = await getDoc(orderRef);
  if (!orderSnapshot.exists()) throw new Error("pedido-nao-encontrado");
  const current = orderSnapshot.data() as CustomerOrder;
  if ((current.status === "cancelado") === (status === "cancelado")) return updateDoc(orderRef, { status, updatedAt: new Date().toISOString() });
  const stockRef = doc(firestore, "stockStatus", current.perfumeId);
  const apcRef = doc(firestore, "apcStatus", current.perfumeId);
  await runTransaction(firestore, async (transaction) => {
    const latestOrder = await transaction.get(orderRef);
    const stockSnapshot = await transaction.get(stockRef);
    if (!latestOrder.exists()) throw new Error("pedido-nao-encontrado");
    const latest = latestOrder.data() as CustomerOrder;
    const reservedMl = stockSnapshot.exists() ? Number(stockSnapshot.data().reservedMl) || 0 : 0;
    const volumeMl = (Number(latest.volumeMl) || 0) * (Number(latest.quantity) || 1);
    const restored = latest.status === "cancelado" && status !== "cancelado";
    transaction.update(orderRef, { status, updatedAt: new Date().toISOString() });
    transaction.set(stockRef, { perfumeId: latest.perfumeId, reservedMl: Math.max(0, reservedMl + (restored ? volumeMl : -volumeMl)), lastOrderId: stockSnapshot.exists() ? String(stockSnapshot.data().lastOrderId || "admin-status") : "admin-status", updatedAt: new Date().toISOString() });
    if (latest.isApc) {
      if (status === "cancelado") transaction.delete(apcRef);
      else if (restored) transaction.set(apcRef, { perfumeId: latest.perfumeId, reserved: true, orderId: orderId, volumeMl: latest.volumeMl, reservedAt: new Date().toISOString() });
    }
  });
}

export async function deleteCustomerOrders(orderIds: string[]) {
  await Promise.all(orderIds.map(async (orderId) => {
    const orderRef = doc(firestore, "pedidos", orderId);
    await runTransaction(firestore, async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists()) return;
      const order = orderSnapshot.data() as CustomerOrder;
      const stockRef = doc(firestore, "stockStatus", order.perfumeId);
      const stockSnapshot = await transaction.get(stockRef);
      const reservedMl = stockSnapshot.exists() ? Number(stockSnapshot.data().reservedMl) || 0 : 0;
      const volumeMl = (Number(order.volumeMl) || 0) * (Number(order.quantity) || 1);
      transaction.delete(orderRef);
      if (order.status !== "cancelado") transaction.set(stockRef, { perfumeId: order.perfumeId, reservedMl: Math.max(0, reservedMl - volumeMl), lastOrderId: "admin-delete", updatedAt: new Date().toISOString() });
      if (order.isApc) transaction.delete(doc(firestore, "apcStatus", order.perfumeId));
    });
  }));
}

export async function saveCatalog(perfumes: Record<string, unknown>[]) {
  await setDoc(catalogRef, { perfumes, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function syncApcStatus(entries: Array<Omit<ApcStatus, "reservedAt">>) {
  const currentStatus = await getDocs(apcStatusRef);
  const activePerfumeIds = new Set(entries.map((entry) => entry.perfumeId));
  const batch = writeBatch(firestore);
  const now = new Date().toISOString();
  entries.forEach((entry) => batch.set(doc(firestore, "apcStatus", entry.perfumeId), { ...entry, reservedAt: now }));
  currentStatus.docs.filter((item) => !activePerfumeIds.has(item.id)).forEach((item) => batch.delete(item.ref));
  if (entries.length || currentStatus.size) await batch.commit();
}

export async function syncStockStatus(entries: Array<Omit<StockStatus, "updatedAt">>) {
  const currentStatus = await getDocs(stockStatusRef);
  const summaries = new Map(entries.map((entry) => [entry.perfumeId, entry]));
  currentStatus.docs.forEach((item) => {
    if (!summaries.has(item.id)) summaries.set(item.id, { perfumeId: item.id, reservedMl: 0 });
  });
  const batch = writeBatch(firestore);
  const now = new Date().toISOString();
  summaries.forEach((entry) => batch.set(doc(firestore, "stockStatus", entry.perfumeId), { ...entry, updatedAt: now }));
  if (summaries.size) await batch.commit();
}
