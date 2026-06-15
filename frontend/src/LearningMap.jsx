import { useEffect, useState, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export default function LearningMap({ onExplore }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [selectedConcept, setSelectedConcept] = useState(null)
  const [conceptDetail, setConceptDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/brain`)
      .then(r => r.json())
      .then(brain => {
        const exploredNodes = Object.entries(brain.concepts)
          .filter(([, data]) => data.encounteredAs.includes('main'))
          .map(([name]) => ({ id: name }))

        const nodeIds = new Set(exploredNodes.map(n => n.id))

        const links = brain.connections
          .filter(c => nodeIds.has(c.from) && nodeIds.has(c.to))
          .map(c => ({ source: c.from, target: c.to }))

        setGraphData({ nodes: exploredNodes, links })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width
      if (width > 0) setCanvasWidth(width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (graphData.nodes.length === 0) return
    const timer = setTimeout(() => {
      graphRef.current?.zoom(0.5, 0)
    }, 600)
    return () => clearTimeout(timer)
  }, [graphData])

  async function handleNodeClick(node) {
    setSelectedConcept(node.id)
    setDetailLoading(true)
    setConceptDetail(null)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/concept/${encodeURIComponent(node.id)}`)
      const data = await res.json()
      setConceptDetail(data)
    } catch {
      setConceptDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  if (graphData.nodes.length === 0) return null

  return (
    <div className="learning-map">
      <p className="section-label">Your learning map</p>
      <div className="map-layout">
        <div className="map-canvas" ref={containerRef}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={canvasWidth}
            height={480}
            warmupTicks={300}
            cooldownTicks={0}
            nodeLabel="id"
            linkColor={() => '#5eead4'}
            linkWidth={1.5}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const isSelected = node.id === selectedConcept
              const radius = 5
              const fontSize = Math.max(11, 12 / globalScale)

              ctx.beginPath()
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
              ctx.fillStyle = isSelected ? '#0f766e' : '#0d9488'
              ctx.fill()
              if (isSelected) {
                ctx.strokeStyle = '#134e4a'
                ctx.lineWidth = 1.5
                ctx.stroke()
              }

              ctx.font = `${fontSize}px system-ui, sans-serif`
              ctx.fillStyle = '#134e4a'
              ctx.fillText(node.id, node.x + 9, node.y + fontSize / 3)
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath()
              ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI)
              ctx.fillStyle = color
              ctx.fill()
            }}
          />
        </div>

        {selectedConcept && (
          <div className="concept-panel">
            <button
              className="panel-close"
              onClick={() => { setSelectedConcept(null); setConceptDetail(null) }}
            >
              ×
            </button>
            <h3 className="panel-title">{selectedConcept}</h3>
            <button
              className="panel-explore-btn"
              onClick={() => onExplore(selectedConcept, null, true)}
            >
              Explore again
            </button>

            {detailLoading && <p className="panel-loading">Loading...</p>}

            {conceptDetail && (
              <>
                <p className="panel-explanation">{conceptDetail.explanation}</p>

                {conceptDetail.realWorldExample && (
                  <div className="panel-section">
                    <p className="section-label">In practice</p>
                    <p>{conceptDetail.realWorldExample}</p>
                  </div>
                )}

                {conceptDetail.followUps.length > 0 && (
                  <div className="panel-section">
                    <p className="section-label">Questions you asked</p>
                    {conceptDetail.followUps.map((fu, i) => (
                      <div key={i} className="panel-followup">
                        <p className="panel-followup-q">{fu.question}</p>
                        <p className="panel-followup-a">{fu.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
