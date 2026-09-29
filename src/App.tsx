import './App.css'

function App() {
  return (
    <main className="setup-screen">
      <div className="scanline" aria-hidden="true" />
      <header className="topbar">
        <span className="brand-mark">JDV</span>
        <span className="status">
          <i /> sistema online
        </span>
      </header>

      <section className="intro" aria-labelledby="game-title">
        <p className="eyebrow">FATEC // EQUIPE 03</p>
        <h1 id="game-title">Jogo do Velho</h1>
        <p className="subtitle">Uma disputa 4×4. Uma sala. Nenhuma jogada neutra.</p>
        <div className="setup-badge">base do projeto pronta</div>
      </section>

      <section className="next-step" aria-labelledby="next-step-title">
        <div>
          <p className="eyebrow">próximo módulo</p>
          <h2 id="next-step-title">O tabuleiro está chegando.</h2>
        </div>
        <span className="module-code">01 / BOARD</span>
      </section>
    </main>
  )
}

export default App
