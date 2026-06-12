import Tree from 'react-d3-tree'

function buildTreeData(concepts) {
  if (!concepts || concepts.length === 0) return null

  // Start from the last concept and work backwards to build nested structure
  let tree = { name: concepts[concepts.length - 1] }
  for (let i = concepts.length - 2; i >= 0; i--) {
    tree = { name: concepts[i], children: [tree] }
  }
  return tree
}

export default function TreeView({ concepts }) {
  const treeData = buildTreeData(concepts)
  if (!treeData) return null

  return (
    <div className="tree-container">
      <p className="section-label">Your learning path</p>
      <div className="tree-canvas">
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 300, y: 60 }}
          zoom={0.9}
          nodeSize={{ x: 200, y: 100 }}
          separation={{ siblings: 1, nonSiblings: 1 }}
          renderCustomNodeElement={({ nodeDatum }) => (
            <g>
              <circle r={6} fill="#6c8ebf" stroke="#4a6fa5" strokeWidth={2} />
              <text
                x={12}
                y={4}
                fontSize={13}
                fill="#1a1a2e"
                fontFamily="inherit"
              >
                {nodeDatum.name}
              </text>
            </g>
          )}
        />
      </div>
    </div>
  )
}
