import Link from 'next/link';
import styles from './landing.module.css';

function Mark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`${styles.mark} ${inverse ? styles.inverse : ''}`} aria-hidden="true"><i/><i/><i/></span>;
}

function Arrow() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function Home() {
  return <main className={styles.site}>
    <div className={styles.scaleBar}><span>✳ TECNOLOGÍA APLICADA A DESAFÍOS REALES</span><i>·</i><span>UNA APLICACIÓN DE SKALE IA</span></div>
    <nav className={styles.nav} aria-label="Navegación principal">
      <a className={styles.logo} href="#inicio" aria-label="Skalio, inicio"><Mark/><span>skalio<small>by SKALE IA</small></span></a>
      <div className={styles.links}><a href="#como-funciona">Producto</a><a href="#beneficios">Cómo trabajamos</a><a href="https://www.skale.cl" target="_blank" rel="noreferrer">Skale IA ↗</a></div>
      <Link className={styles.navCta} href="/app">Entrar <Arrow/></Link>
    </nav>

    <section className={styles.hero} id="inicio">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span/> UNA APLICACIÓN SKALE IA</p>
        <h1>Tu operación,<br/>lista para <em>escalar.</em></h1>
        <p className={styles.intro}>SKALIO es la aplicación de cotizaciones de Skale IA: un espacio simple para que clientes, precios y propuestas avancen juntos.</p>
        <div className={styles.actions}><Link href="/app" className={styles.primary}>Comenzar ahora <Arrow/></Link><a href="#como-funciona" className={styles.textLink}>Ver cómo funciona <span>↓</span></a></div>
        <div className={styles.proof}><div className={styles.skaleSeal}>S</div><span>Diseñada y desarrollada por<br/><strong>SKALE IA · Tecnología útil.</strong></span></div>
      </div>
      <div className={styles.heroVisual} aria-label="Vista previa de Skalio">
        <div className={styles.sun}/><div className={styles.ring}/>
        <div className={styles.dashboard}>
          <div className={styles.dashSide}><div className={styles.dashMiniLogo}><Mark inverse/></div><span className={styles.sideActive}/><span/><span/><span/><span/></div>
          <div className={styles.dashMain}>
            <div className={styles.dashTop}><span>Resumen</span><i/><i/></div>
            <div className={styles.welcome}><p>BUEN DÍA, MARTA</p><b>Todo en movimiento.</b><button>+ Nueva cotización</button></div>
            <div className={styles.metrics}><div><small>PROPUESTAS ACTIVAS</small><b>24</b><em>+12% este mes</em></div><div><small>MONTO COTIZADO</small><b>$18.4M</b><em>↗ 8.2% vs. anterior</em></div></div>
            <div className={styles.chart}><div className={styles.chartHead}><b>Ritmo comercial</b><span>Últimos 6 meses</span></div><div className={styles.bars}><i/><i/><i/><i/><i/><i/><i/></div></div>
            <div className={styles.quoteCard}><div><span className={styles.quoteIcon}>↗</span><p>Nueva cotización</p><b>Edificio Los Alerces</b></div><strong>Enviada</strong></div>
          </div>
        </div>
        <div className={styles.floatCard}><span>Éxito de propuesta</span><b>+ 34<span>%</span></b><i>↑ este mes</i></div>
      </div>
    </section>

    <section className={styles.band}><p>TECNOLOGÍA QUE CONECTA, PROTEGE Y HACE CRECER.</p><div><span>entiende</span><i/> <span>diseña</span><i/> <span>implementa</span><i/> <span>acompaña</span></div></section>

    <section className={styles.story} id="como-funciona">
      <div className={styles.sectionIntro}><p className={styles.eyebrow}><span/> PRODUCTO DIGITAL SKALE IA</p><h2>La tecnología funciona<br/>cuando hace <em>avanzar.</em></h2></div>
      <div className={styles.featureGrid}>
        <article className={`${styles.feature} ${styles.featureMint}`}><span className={styles.featureNo}>01 / ENTENDEMOS</span><div className={styles.iconCircle}>⌁</div><h3>Cotizaciones que se entienden</h3><p>Arma propuestas profesionales con tu identidad, precios claros y totales listos para compartir.</p><a href="#precios">Explorar cotizaciones <Arrow/></a></article>
        <article className={`${styles.feature} ${styles.featureDark}`}><span className={styles.featureNo}>02 / DISEÑAMOS</span><div className={styles.orbit}><i/><b>+</b></div><h3>Tu operación, en su sitio</h3><p>Clientes, catálogo y servicios conectados para volver a cotizar sin partir desde cero.</p><a href="#beneficios">Conocer el espacio <Arrow/></a></article>
        <article className={`${styles.feature} ${styles.featureCream}`}><span className={styles.featureNo}>03 / ACOMPAÑAMOS</span><div className={styles.spark}>✦</div><h3>Decisiones con señal</h3><p>Mira la actividad comercial y detecta qué propuestas necesitan tu siguiente paso.</p><a href="#beneficios">Ver el panel <Arrow/></a></article>
      </div>
    </section>

    <section className={styles.split} id="beneficios"><div className={styles.splitVisual}><div className={styles.paper}><div className={styles.paperBrand}><Mark/><b>skalio</b><span>COTIZACIÓN</span></div><div className={styles.paperTitle}>Conexión<br/>Edificio Alameda</div><div className={styles.paperRows}><i/><i/><i/><i/></div><div className={styles.paperTotal}><span>TOTAL</span><b>$ 2.840.000</b></div></div><div className={styles.miniNote}>Listo para<br/><b>enviar</b> <span>↗</span></div></div><div className={styles.splitCopy}><p className={styles.eyebrow}><span/> LA MIRADA SKALE IA</p><h2>De la necesidad a la <em>solución.</em></h2><p>SKALIO nace de la misma forma de trabajar de Skale IA: entender lo que necesita tu operación, diseñar lo útil e implementarlo con claridad.</p><ul><li><b>01</b> Clientes siempre a mano</li><li><b>02</b> Catálogo y servicios reutilizables</li><li><b>03</b> Documentos listos para imprimir</li></ul><a href="https://www.skale.cl" target="_blank" rel="noreferrer" className={styles.primary}>Conocer Skale IA <Arrow/></a></div></section>

    <section className={styles.cta} id="precios"><p className={styles.eyebrow}><span/> UNA APP DE SKALE IA</p><h2>Lo que sigue,<br/><em>empieza</em> hoy.</h2><p>Una herramienta creada para convertir una operación más clara en más oportunidades.</p><Link href="/app" className={styles.lightButton}>Empezar con SKALIO <Arrow/></Link><div className={styles.ctaMark}><Mark inverse/></div></section>

    <footer className={styles.footer}><a className={styles.logo} href="#inicio"><Mark/><span>skalio<small>by SKALE IA</small></span></a><span>Una aplicación de <a href="https://www.skale.cl" target="_blank" rel="noreferrer">SKALE IA</a>.<br/>Tecnología que conecta, protege y hace crecer.</span><div><a href="https://www.skale.cl" target="_blank" rel="noreferrer">SKALE IA ↗</a><a href="#como-funciona">Producto</a><Link href="/app">Entrar</Link></div></footer>
  </main>;
}
