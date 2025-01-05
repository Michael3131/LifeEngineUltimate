const CellStates = require("../Organism/Cell/CellStates");
const SerializeHelper = require("../Utils/SerializeHelper");
const Species = require("./Species");
const TreeOfLifeChart = require("./TreeOfLifeChart");
const FossilRecord = {
    init: function(){
        this.extant_species = {};
        this.extinct_species = {};

        // if an organism has fewer than this cumulative pop, discard them on extinction
        this.min_discard = 1;

        this.record_size_limit = 5000000; // original 500 // store this many data points
    },

    setEnv: function(env) {
        this.env = env;
        this.setData();
    },

    addSpecies: function(org, ancestor) {
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks);
        this.extant_species[new_species.name] = new_species;
        org.species = new_species;
        // TODO
          // ADDON
        // Logic for creating a new species...
        if (!ancestor)
        {
            console.log("new tree!")
            let treeData = {
                name: org.species.name,
                anatomy: org.anatomy,
                the_org: org,
                children: [],
            };
            // build new tree from that one?
            console.log("before render of new",treeData)
            TreeOfLifeChart.renderTree(treeData, "treeContainer")
            TreeOfLifeChart.incrementPopulation(org.species.name);
        }
        else
        {
            // console.log("BEFORE");
            // console.log(org);
            // console.log("org");
            // console.log(ancestor);
            const newSpecies = {
                name: org.species.name,         // Name of the new species
                parent: ancestor.name,     // Parent species name
                anatomy: org.anatomy,
                the_org: org,
                children: [],        // Additional data if needed
            };


            //console.log("Added New Species in FR: ",newSpecies.anatomy);
            // Dynamically update the Tree of Life
            TreeOfLifeChart.updateTree(newSpecies);
            TreeOfLifeChart.incrementPopulation(org.species.name);
        }
        return new_species;
    },

    addSpeciesObj: function(species) {
        console.log("Is this hit??")
        if (this.extant_species[species.name]) {
            console.warn('Tried to add already existing species. Add failed.');
            return;
        }

 


        this.extant_species[species.name] = species;
        return species;
    },

    changeSpeciesName: function(species, new_name) {
        if (this.extant_species[new_name]) {
            console.warn('Tried to change species name to an existing species name. Change failed.');
            return;
        }
        delete this.extant_species[species.name];
        species.name = new_name;
        this.extant_species[new_name] = species;
    },

    numExtantSpecies() {return Object.values(this.extant_species).length},
    numExtinctSpecies() {return Object.values(this.extinct_species).length},
    speciesIsExtant(species_name) {return !!this.extant_species[species_name]},

    fossilize: function(species) {
        if (!this.extant_species[species.name]) {
            console.warn('Tried to fossilize non existing species.');
            return false;
        }
        species.end_tick = this.env.total_ticks;
        species.ancestor = undefined; // garbage collect ancestors
        delete this.extant_species[species.name];
        if (species.cumulative_pop >= this.min_discard) {
            TreeOfLifeChart.markSpeciesExtinct(species.name);
            // TODO: store as extinct species // tee hee i did it for you :)
            return true;
        }
        return false;
    },

    resurrect: function(species) {
        if (species.extinct) {
            species.extinct = false;
            this.extant_species[species.name] = species;
            delete this.extinct_species[species.name];
        }
    },

    setData() {
        // all parallel arrays
        this.tick_record = [];
        this.pop_counts = [];
        this.species_counts = [];
        this.av_mut_rates = [];
        this.av_cells = [];
        this.av_cell_counts = [];
        this.updateData();
    },

    updateData() {
        var tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.numExtantSpecies());
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();
        while (this.tick_record.length > this.record_size_limit) {
            this.tick_record.shift();
            this.pop_counts.shift();
            this.species_counts.shift();
            this.av_mut_rates.shift();
            this.av_cells.shift();
            this.av_cell_counts.shift();
        }
    },

    calcCellCountAverages() {
        var total_org = 0;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        var first=true;
        for (let s of Object.values(this.extant_species)) {
            if (!first && this.numExtantSpecies() > 10 && s.cumulative_pop < this.min_discard){
                continue;
            }
            for (let name in s.cell_counts) {
                cell_counts[name] += s.cell_counts[name] * s.population;
            }
            total_org += s.population;
            first=false;
        }
        if (total_org == 0) {
            this.av_cells.push(0);
            this.av_cell_counts.push(cell_counts);
            return;
        }

        var total_cells = 0;
        for (let c in cell_counts) {
            total_cells += cell_counts[c];
            cell_counts[c] /= total_org;
        }
        this.av_cells.push(total_cells / total_org);
        this.av_cell_counts.push(cell_counts);
    },

    getMostPopulousSpecies(){
        var max_pop = 0;
        var max_species = undefined;
        for (let s of Object.values(this.extant_species)) {
            if (s.population > max_pop) {
                max_pop = s.population;
                max_species = s;
            }
        }
        return max_species;
    },

    clear_record() {
        console.log("USe this");
        TreeOfLifeChart.clearTree();
        this.extant_species = [];
        this.extinct_species = [];
        this.setData();
    },

    serialize() {
        this.updateData();
        let record = SerializeHelper.copyNonObjects(this);
        record.records = {
            tick_record:this.tick_record,
            pop_counts:this.pop_counts,
            species_counts:this.species_counts,
            av_mut_rates:this.av_mut_rates,
            av_cells:this.av_cells,
            av_cell_counts:this.av_cell_counts,
        };
        let species = {};
        for (let s of Object.values(this.extant_species)) {
            species[s.name] = SerializeHelper.copyNonObjects(s);
            delete species[s.name].name; // the name will be used as the key, so remove it from the value
        }
        record.species = species;
        return record;
    },

    // FossilRecord.js
    getFossilRecordTree() {
        //console.log(this.)
        return {
            name: "Life",
            children: [
                { name: "Poops", children: [{ name: "PeePee" }, { name: "Whaaa" }] },
                { name: "Plants", children: [{ name: "Ferns" }, { name: "Mosses" }] }
            ]
        };
    },


    loadRaw(record) {
        SerializeHelper.overwriteNonObjects(record, this);
        for (let key in record.records) {
            this[key] = record.records[key];
        }
    }
    

    
}

FossilRecord.init();

module.exports = FossilRecord;