// TreeChart.js
import * as d3 from "d3";
import { getAnatomyBySpecies } from '../Organism/Anatomy.js';

let treeData = {
    name: "Life",
    children: [],
};

// Population map to track species population
const populationMap = new Map();
const extinctSpeciesSet = new Set(); // Track extinct species

// Global threshold for subtree visibility
let populationThreshold = 0;
let isRenderingEnabled = true; // Control flag for rendering

export function setPopulationThreshold(threshold) {
    populationThreshold = threshold;
    // Re-render the tree with the new threshold
    if (isRenderingEnabled) {
        d3.select("#treeContainer").html("");
        renderTree(treeData, "treeContainer");
    }
}
export function searchForNodeByName(node, name) {
    if (node.name === name) return node;
    if (!node.children) return null;

    for (const child of node.children) {
        const result = searchForNodeByName(child, name);
        if (result) return result;
    }

    return null;
}
function calculateSubtreePopulation(node) {
    // Calculate the total population of a node and its descendants
    const population = populationMap.get(node.name) || 0;
    const childPopulation = (node.children || []).reduce((sum, child) => {
        return sum + calculateSubtreePopulation(child);
    }, 0);
    return population + childPopulation;
}



let showExtinctLeaves = false; // Default state

export function setShowExtinctLeaves(show) {
    showExtinctLeaves = show;
    if (isRenderingEnabled) {
        d3.select("#treeContainer").html("");
        renderTree(treeData, "treeContainer");
    }
}

function filterTreeByPopulation(node) {
    const subtreePopulation = calculateSubtreePopulation(node);
    node.subtreePopulation = subtreePopulation; // Store for rendering

    // Exclude extinct leaf nodes if the toggle is off
    if (!showExtinctLeaves && !node.children && extinctSpeciesSet.has(node.name)) {
        return null; // Remove this node
    }

    if (subtreePopulation < populationThreshold) {
        return null; // Exclude this node and its subtree
    }

    const filteredChildren = (node.children || []).map(filterTreeByPopulation).filter(Boolean);

    // If no children are left after filtering and the node is extinct, remove it
    if (!showExtinctLeaves && filteredChildren.length === 0 && extinctSpeciesSet.has(node.name)) {
        return null;
    }

    return { ...node, children: filteredChildren }; // Return the filtered node
}

// function filterTreeByPopulation(node) {
//     const subtreePopulation = calculateSubtreePopulation(node);
//     node.subtreePopulation = subtreePopulation; // Store for rendering

//     if (subtreePopulation < populationThreshold) {
//         return null; // Exclude this node and its subtree
//     }

//     const filteredChildren = (node.children || []).map(filterTreeByPopulation).filter(Boolean);
//     return { ...node, children: filteredChildren }; // Return the filtered node
// }

export function getAnatomy(speciesName) {
    //console.log("Getting anatomy:,",speciesName);
    //console.log("got",searchForNodeByName(treeData,speciesName).anatomy);
    return searchForNodeByName(treeData,speciesName).anatomy;
}

export function showAnatomyTooltip(event, anatomy) {
    const tooltip = d3.select("#anatomy-tooltip");
    tooltip.style("display", "block")
        .html(""); // Clear existing content

    const svg = tooltip.append("svg")
        .attr("width", 100)
        .attr("height", 100);

    // Render anatomy cells in the SVG
    anatomy.cells.forEach(cell => {
        //console.log("Cell",cell);
        svg.append("rect") // Change circle to rect for square representation
            .attr("x", cell.loc_col * 10 + 10) // Scale and center
            .attr("y", cell.loc_row * 10 + 10)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", cell.state.color);
    });
     // Position tooltip within the viewport
     const tooltipWidth = 100; // Adjust based on tooltip size
     const tooltipHeight = 100;
     const pageWidth = window.innerWidth;
     const pageHeight = window.innerHeight;
     let left = event.pageX + 10;
     let top = event.pageY;
 
     // Adjust if tooltip goes beyond viewport
     if (left + tooltipWidth > pageWidth) {
         left = pageWidth - tooltipWidth - 10;
     }
     if (top + tooltipHeight > pageHeight) {
         top = pageHeight - tooltipHeight - 10;
     }
 
     tooltip.style("left", `${left}px`);
     tooltip.style("top", `${top}px`);
}

// function openOrganismInEditor(speciesName) {
//     console.log(`Opening organism: ${speciesName} in the editor.`);
//     const editorTab = document.getElementById('editor');
//     if (editorTab) {
//         // Switch to the Editor tab
//         document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
//         editorTab.style.display = 'block';
//         console.log("Editor tab displayed.");
//     } else {
//         console.error("#editor tab not found.");
//     }

//     // Pass the species name to the EditorController
//     if (window.EditorController && window.EditorController.loadSpeciesInEditor) {
//         window.EditorController.loadSpeciesInEditor(speciesName);
//     } else {
//         console.error("EditorController not found or loadSpeciesInEditor not defined.");
//     }
// }

export function renderTree(initialData, containerId) {
    if (!isRenderingEnabled && treeData) return; // Skip rendering if disabled
    console.log("render tree hit", initialData)
    treeData = initialData; // Set the initial tree data
    
    const width = 750, height = 250;

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(
            d3.zoom().on("zoom", (event) => {
                g.attr("transform", event.transform);

                // Scale the text size dynamically
                g.selectAll("text")
                    .attr("font-size", 12 / event.transform.k + "px");

                // Scale the circle size dynamically
                g.selectAll("circle")
                    .attr("r", 10 / event.transform.k + "px");
            })
        )
        .append("g");

    const g = svg.append("g").attr("transform", "translate(70,50)");
   // nodeEnter.attr("transform", d => `translate(${Math.max(10, d.y)},${d.x})`); // Ensure x >= 10

    const filteredTreeData = filterTreeByPopulation(treeData);
    const root = d3.hierarchy(filteredTreeData);

    // Create a tree layout with horizontal orientation
    const treeLayout = d3.tree().size([height , width ]);
    treeLayout(root);

    // Function to update tree
    function update(source) {
        if (!isRenderingEnabled) return; // Skip updates if rendering is disabled

        treeLayout(root);
        const nodes = root.descendants();
        const links = root.links();

        // Update links
        const link = g.selectAll(".link")
            .data(links, d => `${d.source.data.name}-${d.target.data.name}`);

        link.enter()
            .append("path")
            .attr("class", "link")
            .merge(link)
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            )
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5);

        link.exit().remove();

        // Update nodes
        const node = g.selectAll(".node")
            .data(nodes, d => d.data.name);

        const nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .on("click", function(event, d) {
                if (d.children) {
                    d._children = d.children; // Hide children
                    d.children = null;
                } else {
                    d.children = d._children || d.data.originalChildren; // Show all children
                    d._children = null;
                }
                update(d);
            })
            // .on("contextmenu", function (event, d) {
            //     event.preventDefault(); // Prevent the default context menu
            //     openOrganismInEditor(d.data.name); // Open in editor on right-click
            // })
            .on("mouseover", function (event, d) {
                const anatomy = getAnatomy(d.data.name);
                if (anatomy) {
                    showAnatomyTooltip(event, anatomy);
                }
            })
            .on("mousemove", function (event) {
                const tooltip = d3.select("#anatomy-tooltip");
                tooltip.style("left", `${event.pageX + 10}px`)
                       .style("top", `${event.pageY}px`);
            })
            .on("mouseout", function () {
                d3.select("#anatomy-tooltip").style("display", "none");
            });

        nodeEnter.append("circle")
            .attr("r", 10) // Larger click radius
            .attr("fill", d => d.children || d._children ? "#555" : "#999");

        nodeEnter.append("text")
            .attr("dy", 3)
            .attr("x", d => (d.children || d._children ? -15 : 15)) // Spaced further for visibility
            .style("text-anchor", d => (d.children || d._children ? "end" : "start"))
            .style("fill", d => (extinctSpeciesSet.has(d.data.name) ? "red" : "black")) // Color based on extinction status
            .text(d => {
                const population = populationMap.get(d.data.name) || 0; // Show only this species' population
                return `${d.data.name} (${population})`;
            });

        const nodeUpdate = node.merge(nodeEnter)
            .transition()
            .duration(300)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeUpdate.select("circle")
            .attr("fill", d => d.children || d._children ? "#555" : "#999");

        nodeUpdate.select("text")
            .style("fill", d => (extinctSpeciesSet.has(d.data.name) ? "red" : "black")) // Update color dynamically
            .text(d => {
                const population = populationMap.get(d.data.name) || 0; // Show only this species' population
                return `${d.data.name} (${population})`;
            });

        node.exit().remove();
    }

    // root.descendants().forEach(d => {
        //     if (d.depth > 1) {
            //         d.data.originalChildren = d.children; // Backup all children
            //         d._children = d.children; // Store children in _children
            //         d.children = null; // Hide children
            //     }
            // });
            
    // Collapse children initially
    root.descendants().forEach(d => {
        if (d.depth > 1 && calculateSubtreePopulation(d.data) < populationThreshold) {
            d.data.originalChildren = d.children; // Backup all children
            d._children = d.children; // Store children in _children
            d.children = null; // Hide children
        } else {
            d._children = null; // Ensure nodes passing the threshold are expanded
        }
    });

    update(root);
}

export function updateTree(newSpecies) {
    function findParent(node, parentName) {
        if (node.name === parentName) return node;
        for (const child of node.children || []) {
            const result = findParent(child, parentName);
            if (result) return result;
        }
        return null;
    }

    const parentNode = findParent(treeData, newSpecies.parent);
    if (parentNode) {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(newSpecies);
        // Initialize population in the map
        populationMap.set(newSpecies.name, 0);
    }

    // Re-render the tree
    if (isRenderingEnabled) {
        d3.select("#treeContainer").html(""); // Clear the current tree
        renderTree(treeData, "treeContainer");
    }
}

export function incrementPopulation(speciesName) {
    const currentPopulation = populationMap.get(speciesName) || 0;
    populationMap.set(speciesName, currentPopulation + 1);
    // Re-render the tree with updated population
    if (isRenderingEnabled) {
        d3.select("#treeContainer").html("");
        renderTree(treeData, "treeContainer");
    }
}

export function markSpeciesExtinct(speciesName) {
    extinctSpeciesSet.add(speciesName); // Mark species as extinct
    // Re-render the tree with updated extinction status
    if (isRenderingEnabled) {
        d3.select("#treeContainer").html("");
        renderTree(treeData, "treeContainer");
    }
}

export function enableRendering() {
    isRenderingEnabled = true;
    renderTree(treeData, "treeContainer"); // Re-render when re-enabled
}

export function disableRendering() {
    isRenderingEnabled = false;
}

export function clearTree() {
    treeData = undefined; // Reset tree data
    populationMap.clear(); // Clear population data
    extinctSpeciesSet.clear(); // Clear extinction data
    d3.select("#treeContainer").html(""); // Clear the tree container
}