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
let populationThreshold = 1;
let isRenderingEnabled = true; // Control flag for rendering
let showExtinctLeaves = true; // Default state

export function setPopulationThreshold(threshold) {
    populationThreshold = threshold;
    // Re-render the tree with the new threshold
    //d3.select("#treeContainer").html("");
    if (treeData)
    {
        renderTree(treeData, "treeContainer");
        const sliderValue = document.getElementById('slider-value');
        sliderValue.textContent = populationThreshold; // Update displayed value

    }

}

export function multiplyPopulationThreshold(thresholdMultiplier) {
    // Re-render the tree with the new threshold
    console.log(thresholdMultiplier)

    setPopulationThreshold(Math.ceil(thresholdMultiplier * populationThreshold))
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




export function setShowExtinctLeaves(show) {
    showExtinctLeaves = show;
    renderTree(treeData);
    
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

export function getAnatomy(speciesName) {
    return searchForNodeByName(treeData, speciesName).anatomy;
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
 
     //tooltip.style("left", `${left}px`);
     //tooltip.style("top", `${top}px`);
}


export function renderTree(initialData) {
    d3.select("#treeContainer").html("");

    if (!isRenderingEnabled && treeData) return; // Skip rendering if disabled

    treeData = initialData; // Set the initial tree data
    // Select the container
    const container = d3.select("#treeContainer");

    // Get container dimensions
    const width =  container.node().clientWidth -(container.node().clientWidth)/4;
    const height = container.node().clientHeight//-(container.node().clientHeight)/4;

    const svg = d3.select("#treeContainer")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
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
        ).append("g").attr("width", width)
        .attr("height", height)
        .append("g").attr("transform", `translate(${width / 2},${height / 2})`); // Center the tree

    const g = svg;

    const filteredTreeData = filterTreeByPopulation(treeData);
    if (!filteredTreeData)
    {
        console.log("hmm")
        console.log(treeData)
    }
    const root = d3.hierarchy(filteredTreeData);

    // Create a radial tree layout
    const treeLayout = d3.cluster().size([2 * Math.PI, Math.min(width, height) / 2 - 100]);
    treeLayout(root);

    // Define radial link generator
    const linkGenerator = d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y);

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
            .attr("d", linkGenerator)
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
            .attr("transform", d => `
                rotate(${(d.x * 180 / Math.PI) - 90})
                translate(${d.y})
            `)
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
            .on("mouseover", function (event, d) {
                const anatomy = getAnatomy(d.data.name);
                if (anatomy) {
                    showAnatomyTooltip(event, anatomy);
                }
            })
            // .on("mousemove", function (event) {
            //     const tooltip = d3.select("#anatomy-tooltip");
            //     tooltip.style("left", `${event.pageX + 10}px`)
            //            .style("top", `${event.pageY}px`);
            // })
            .on("mouseout", function () {
                d3.select("#anatomy-tooltip").style("display", "none");
            });

        nodeEnter.append("circle")
            .attr("r", 10) // Larger click radius
            .attr("fill", d => d.children || d._children ? "#555" : "#999");

        nodeEnter.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.x < Math.PI ? 6 : -6)
            .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
            .attr("transform", d => d.x < Math.PI ? null : "rotate(180)")
            .style("fill", d => (extinctSpeciesSet.has(d.data.name) ? "red" : "black")) // Color based on extinction status
            .text(d => {
                const population = populationMap.get(d.data.name) || 0; // Show only this species' population
                return `${d.data.name} (${population})`;
            });

        node.exit().remove();
    }

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
        populationMap.set(newSpecies.name, 1);
    }

    // Re-render the tree
    renderTree(treeData);
    
}

export function incrementPopulation(speciesName) {
    const currentPopulation = populationMap.get(speciesName) || 0;
    populationMap.set(speciesName, currentPopulation + 1);
}

export function markSpeciesExtinct(speciesName) {
    extinctSpeciesSet.add(speciesName); // Mark species as extinct
    renderTree(treeData);
}

// export function enableRendering() {
//     isRenderingEnabled = true;
//     renderTree(treeData); // Re-render when re-enabled
// }

export function disableRendering() {
    isRenderingEnabled = false;
}

export function clearTree() {
    treeData = undefined; // Reset tree data
    populationMap.clear(); // Clear population data
    extinctSpeciesSet.clear(); // Clear extinction data
    d3.select("#treeContainer").html(""); // Clear the tree container
}



document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('population-threshold-slider');
    const sliderValue = document.getElementById('slider-value');

    slider.value = populationThreshold
    sliderValue.textContent = populationThreshold
    // Update the slider value and the threshold
    slider.addEventListener('input', () => {
        const threshold = parseInt(slider.value, 10);
        updateThreshold(threshold)
       
        //setPopulationThreshold(threshold);  // Update the tree rendering
    });


    const toggle = document.getElementById("toggle-extinct-leaves");
    if (toggle) {
        toggle.addEventListener("change", (event) => {
            setShowExtinctLeaves(event.target.checked);
        });
    } else {
        console.error("Toggle element not found.");
    }

    const timesTen = document.getElementById("population-threshold-ten").addEventListener("click", (event) => {
        updateThreshold(populationThreshold * 10);
    });;
    const timesTwo = document.getElementById("population-threshold-half").addEventListener("click", (event) => {
        updateThreshold(Math.ceil(populationThreshold / 2.0));
    });;
    const timesHalf = document.getElementById("population-threshold-two").addEventListener("click", (event) => {
        updateThreshold(populationThreshold * 2);
    });;
    const timesTenth = document.getElementById("population-threshold-tenth").addEventListener("click", (event) => {
        updateThreshold(Math.ceil(populationThreshold / 10.0));
    });;


});


function updateThreshold(newThreshold)
{
    populationThreshold = newThreshold;
    const sliderValue = document.getElementById('slider-value');
    const slider = document.getElementById('population-threshold-slider');

    if (newThreshold > slider.max)
    {
        slider.max = newThreshold;
    }
    slider.value = newThreshold
    sliderValue.textContent = newThreshold;

    // rerender tree
    renderTree(treeData)
}