// Atelier Noir: vitrine assimétrica de descoberta, com filtros editoriais e cards de produto.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, ChevronDown, Heart, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { families, formatPrice, heroImage, logoMark, type Perfume } from "@/lib/catalog";
import { useCatalog } from "@/contexts/CatalogContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import SiteHeader from "@/components/SiteHeader";

type ProductCardProps = Perfume & { favorite: boolean; onFavorite: () => void };
function ProductCard({ slug, name, brand, family, image, accent, shortDescription, volumeOptions, favorite, onFavorite }: ProductCardProps) {
  const lowest = volumeOptions[0]?.price ?? 0;
  return <article className="product-card">
    <div className={`product-visual accent-${accent}`}><Link href={`/perfumes/${slug}`} className="product-image-link" aria-label={`Ver ${name}`}>{image ? <img src={image} alt={`${name} — ${brand}`} loading="lazy" /> : <span className="product-image-fallback">SIAROM</span>}</Link><button className={`favorite-button ${favorite ? "is-favorite" : ""}`} aria-label={favorite ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`} onClick={onFavorite}><Heart size={17} fill={favorite ? "currentColor" : "none"} strokeWidth={1.6} /></button></div>
    <div className="product-card-content"><div className="product-card-meta"><span>{family}</span><span className="meta-line" /><span>{volumeOptions.length} volumes</span></div><Link href={`/perfumes/${slug}`} className="product-card-title">{name}</Link><p className="product-card-brand">{brand}</p><p className="product-card-description">{shortDescription}</p><div className="product-card-footer"><div><span className="from-label">a partir de</span><strong>{formatPrice(lowest)}</strong></div><Link href={`/perfumes/${slug}`} className="round-arrow" aria-label={`Conhecer ${name}`}><ArrowUpRight size={17} strokeWidth={1.5} /></Link></div></div>
  </article>;
}

export default function Home() {
  const { perfumes, isLoading, syncError } = useCatalog();
  const [activeFamily, setActiveFamily] = useState("Todos");
  const { searchQuery: query, setSearchQuery: setQuery, favorites, toggleFavorite } = useStorefront();
  const [filterOpen, setFilterOpen] = useState(false);
  const filteredPerfumes = useMemo(() => perfumes.filter((perfume) => {
    const matchesFamily = activeFamily === "Todos" || perfume.family === activeFamily;
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || `${perfume.name} ${perfume.brand} ${perfume.family}`.toLowerCase().includes(normalized);
    return matchesFamily && matchesQuery;
  }), [activeFamily, query, perfumes]);
  return <div className="site-shell"><SiteHeader /><main>
    <section className="hero-section" aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-rule" /> SIAROM / perfumaria fina</div><h1 id="hero-title">Encontre o perfume<br /><em>que permanece.</em></h1><p className="hero-description">Frações de perfumes de presença para você experimentar com calma antes de escolher sua assinatura.</p><a className="primary-link" href="#catalogo">Ver perfumes <ArrowUpRight size={17} strokeWidth={1.5} /></a></div><div className="hero-media"><img src={heroImage} alt="Frasco de perfume em composição editorial SIAROM" /></div></section>
    <section className="family-strip" id="generos" aria-label="Gêneros de perfume"><div className="section-kicker"><Sparkles size={14} strokeWidth={1.4} /> encontre por gênero</div><div className="family-list">{families.slice(1).map((family, index) => <button key={family} onClick={() => { setActiveFamily(family); document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }); }}><span>0{index + 1}</span>{family}<ArrowUpRight size={14} strokeWidth={1.4} /></button>)}</div></section>
    <section className="catalog-section" id="catalogo"><div className="catalog-heading"><div><div className="eyebrow"><span className="eyebrow-rule" /> Catálogo SIAROM</div><h2>Perfumes para <em>conhecer.</em></h2></div><p>Escolha uma fragrância, selecione sua fração e registre seu pedido.</p></div>
      <div className="catalog-toolbar"><div className="result-count"><strong>{String(filteredPerfumes.length).padStart(2, "0")}</strong> perfumes disponíveis</div><div className="toolbar-controls"><label className="catalog-search"><Search size={16} strokeWidth={1.5} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou marca" /></label><button className="filter-trigger" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} strokeWidth={1.5} /> Filtros <ChevronDown size={14} strokeWidth={1.5} /></button></div></div>
      {syncError && <div className="catalog-alert">Não foi possível sincronizar o catálogo agora. Tente novamente em instantes.</div>}
      <div className="catalog-layout"><aside className={`filter-panel ${filterOpen ? "is-open" : ""}`}><div className="filter-panel-header"><span>Filtrar por gênero</span><button onClick={() => setFilterOpen(false)} aria-label="Fechar filtros"><X size={18} /></button></div><div className="filter-group"><span className="filter-label">Gênero</span>{families.map((family) => <button key={family} className={`filter-option ${activeFamily === family ? "is-active" : ""}`} onClick={() => { setActiveFamily(family); setFilterOpen(false); }}>{family}<span>{family === "Todos" ? perfumes.length : perfumes.filter((perfume) => perfume.family === family).length}</span></button>)}</div><button className="clear-filter" onClick={() => { setActiveFamily("Todos"); setQuery(""); setFilterOpen(false); }}>Limpar seleção</button></aside><div className="product-grid">{isLoading ? <div className="catalog-empty"><span className="loading-orbit" />Carregando o arquivo SIAROM…</div> : filteredPerfumes.length === 0 ? <div className="catalog-empty"><strong>Nenhuma fragrância publicada.</strong><span>{syncError ? "Verifique a conexão com o Firebase." : "Use o painel admin para adicionar o primeiro perfume ao catálogo."}</span></div> : filteredPerfumes.map((perfume, index) => <div className="card-reveal" key={perfume.slug} style={{ "--reveal-delay": `${index * 45}ms` } as React.CSSProperties}><ProductCard {...perfume} favorite={favorites.includes(perfume.slug)} onFavorite={() => toggleFavorite(perfume.slug)} /></div>)}</div></div>
    </section>
    <section className="editorial-panel" id="sobre"><div className="editorial-mark"><img src={logoMark} alt="" /></div><div><div className="eyebrow light"><span className="eyebrow-rule" /> O gesto SIAROM</div><h2>Uma fragrância<br /><em>começa na pele.</em></h2></div><div className="editorial-copy"><p>A SIAROM nasceu para aproximar você de perfumes que merecem tempo. Selecionamos matérias, texturas e assinaturas para que cada descoberta seja pessoal.</p><Link href="/#catalogo" className="text-link light-link">Conhecer a seleção <ArrowUpRight size={17} strokeWidth={1.5} /></Link></div></section>
  </main><footer className="site-footer"><div className="footer-brand"><span>SIAROM</span><small>Raffinement parfum</small></div><p>Curadoria de perfumaria fina, em frações.</p><Link href="/admin" className="footer-admin-link" aria-label="Acessar área reservada">Área reservada</Link><span className="footer-copyright">© 2026 SIAROM</span></footer></div>;
}
