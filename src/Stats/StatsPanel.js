const PopulationChart = require("./Charts/PopulationChart");
const PopulationChartLog = require("./Charts/PopulationChartLog");
const SpeciesChart = require("./Charts/SpeciesChart");
const MutationChart = require("./Charts/MutationChart");
const CellsChart = require("./Charts/CellsChart");
const FossilRecord = require("./FossilRecord");
const TreeOfLifeChart = require("./TreeOfLifeChart");
// TODO looks like to me this is how I can make new charts without editing the old ones.
const ChartSelections = [PopulationChart, PopulationChartLog, SpeciesChart, CellsChart, MutationChart];

class StatsPanel {
    constructor(env) {
        this.defineControls();
        this.chart_selection = 0;
        this.setChart();
        this.env = env;
        this.last_reset_count=env.reset_count;
    }

    setChart(selection=this.chart_selection) {
        this.chart_controller = new ChartSelections[selection]();
        this.chart_controller.setData();
        this.chart_controller.render();
    }

    startAutoRender() {
        this.setChart();
        this.render_loop = setInterval(function(){this.updateChart();}.bind(this), 1000);
    }

    stopAutoRender() {
        clearInterval(this.render_loop);
    }

    defineControls() {
        $('#chart-option').change ( function() {
            this.chart_selection = $("#chart-option")[0].selectedIndex;
            this.setChart();
        }.bind(this));
    }

    updateChart() {
        if (this.last_reset_count < this.env.reset_count){
            this.reset()
        }
        this.last_reset_count = this.env.reset_count;
        this.chart_controller.updateData();
        this.chart_controller.render();
    }

    updateDetails() {
        var org_count = this.env.organisms.length;
        $('#org-count').text("Total Population: " + org_count);
        $('#species-count').text("Number of Species: " + FossilRecord.numExtantSpecies());
        let top_species = FossilRecord.getMostPopulousSpecies();
        if (top_species)
            $('#top-species').text("Most Populous Species: \"" + top_species.name + "\" (" + top_species.population + " organisms)");
        else    
            $('#top-species').text("Most Populous Species: None");
        $('#largest-org').text("Largest Organism Ever: " + this.env.largest_cell_count + " cells");
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.env.averageMutability() * 100) / 100);


       
    }

    reset() {
        this.setChart();
    }
    
}

// Example tree data
// const treeData = {
//     name: "Life",
//     children: [
//         { name: "Animals", children: [{ name: "Mammals" }, { name: "Birds" }] },
//         { name: "Plants", children: [{ name: "Ferns" }, { name: "Mosses" }] }
//     ]
// };

// // Render the tree in the `treeContainer` div
// document.addEventListener("DOMContentLoaded", () => {
//     TreeOfLifeChart.renderTree(treeData, "treeContainer");
// });


module.exports = StatsPanel;