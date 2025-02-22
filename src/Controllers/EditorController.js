const CanvasController = require("./CanvasController");
const Modes = require("./ControlModes");
const CellStates = require("../Organism/Cell/CellStates");
const Directions = require("../Organism/Directions");
const Hyperparams = require("../Hyperparameters");
const Species = require("../Stats/Species");
const LoadController = require("./LoadController");
const FossilRecord = require("../Stats/FossilRecord");


class EditorController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.edit_cell_type = null;
        this.highlight_org = false;
        this.defineCellTypeSelection();
        this.defineEditorDetails();
        this.defineSaveLoad();
    }
    
    mouseMove() {
        if (this.right_click || this.left_click)
            this.editOrganism();
    }
    
    mouseDown() {
        this.editOrganism();
    }
    
    mouseUp(){}
    
    getCurLocalCell(){
        return this.env.organism.anatomy.getLocalCell(this.mouse_c-this.env.organism.c, this.mouse_r-this.env.organism.r);
    }
    
    editOrganism() {
        if (this.edit_cell_type == null || this.mode != Modes.Edit)
            return;
        if (this.left_click){
            if(this.edit_cell_type == CellStates.eye && this.cur_cell.state == CellStates.eye) {
                var loc_cell = this.getCurLocalCell();
                loc_cell.direction = Directions.rotateRight(loc_cell.direction);
                this.env.renderFull();
            }
            else
            this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
    }
    else if (this.right_click)
        this.env.removeCellFromOrg(this.mouse_c, this.mouse_r);
    
    this.setBrainPanelVisibility();
    this.setMoveRangeVisibility();
    this.updateDetails();
}

updateDetails() {
    $('.species-name').text("Species name: "+this.env.organism.species.name);
    $('.cell-count').text("Cell count: "+this.env.organism.anatomy.cells.length);
    if (this.env.organism.isNatural()){
        $('#unnatural-org-warning').css('display', 'none');
    }
    else {
        $('#unnatural-org-warning').css('display', 'block');
    }
}

defineCellTypeSelection() {
    var self = this;
    $('.cell-type').click( function() {
        switch(this.id){
            case "mouth":
                self.edit_cell_type = CellStates.mouth;
                break;
                case "producer":
                    self.edit_cell_type = CellStates.producer;
                    break;
                    case "mover":
                        self.edit_cell_type = CellStates.mover;
                        break;
                        case "killer":
                            self.edit_cell_type = CellStates.killer;
                            break;
                            case "armor":
                                self.edit_cell_type = CellStates.armor;
                                break;
                                case "eye":
                                    self.edit_cell_type = CellStates.eye;
                                    break;
                                }
                                $(".cell-type" ).css( "border-color", "black" );
                                var selected = '#'+this.id+'.cell-type';
                                $(selected).css("border-color", "yellow");
                            });
                        }
                        
                        defineEditorDetails() {
                            this.details_html = $('#organism-details');
                            this.edit_details_html = $('#edit-organism-details');
                            
                            this.decision_names = ["ignore", "move away", "move towards"];
                            
                            $('#species-name-edit').on('focusout', function() {
                                const new_name = $('#species-name-edit').val();
                                if (new_name === '' || new_name === this.env.organism.species.name)
                                    return;
                                FossilRecord.changeSpeciesName(this.env.organism.species, new_name);
                            }.bind(this));
                            
                            $('#move-range-edit').change ( function() {
                                this.env.organism.move_range = parseInt($('#move-range-edit').val());
                            }.bind(this));
                            
                            $('#mutation-rate-edit').change ( function() {
                                this.env.organism.mutability = parseInt($('#mutation-rate-edit').val());
                            }.bind(this));
                            $('#observation-type-edit').change ( function() {
                                this.setBrainEditorValues($('#observation-type-edit').val());
                                this.setBrainDetails();
                            }.bind(this));
                            $('#reaction-edit').change ( function() {
                                var obs = $('#observation-type-edit').val();
                                var decision = parseInt($('#reaction-edit').val());
                                this.env.organism.brain.decisions[obs] = decision;
                                this.setBrainDetails();
                            }.bind(this));
                        }
                        
                        defineSaveLoad() {
                            $('#save-org').click(()=>{
                                let org = this.env.organism.serialize();
                                let data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(org));
                                let downloadEl = document.getElementById('download-el');
                                downloadEl.setAttribute("href", data);
                                const name = this.env.organism.species.name ? this.env.organism.species.name : "organism";
                                downloadEl.setAttribute("download", name+".json");
                                downloadEl.click();
                            });
                            $('#load-org').click(() => {
                                LoadController.loadJson((org)=>{
                                    this.loadOrg(org);
                                });
                            });
                        }
                        
                        loadOrg(org) {
                            this.env.clear();
                            this.env.organism.loadRaw(org);
                            this.refreshDetailsPanel();
                            this.env.organism.updateGrid();
                            this.env.renderFull();
                            this.env.organism.species = new Species(this.env.organism.anatomy, null, 0);
                            if (org.species_name)
                                this.env.organism.species.name = org.species_name;
                            if (this.mode === Modes.Clone)
                                $('#drop-org').click();
                        }
                        
                        clearDetailsPanel() {
                            $('#organism-details').css('display', 'none');
                            $('#edit-organism-details').css('display', 'none');
                            $('#randomize-organism-details').css('display', 'none');
                        }
                        
                        refreshDetailsPanel() {
                            if (this.mode === Modes.Edit)
                                this.setEditorPanel();
                            else
                            this.setDetailsPanel();
                        
                    }
                    
                    setDetailsPanel() {
                        this.clearDetailsPanel();
                        var org = this.env.organism;
                        
                        this.updateDetails();
                        $('#move-range').text("Move Range: "+org.move_range);
                        $('#mutation-rate').text("Mutation Rate: "+org.mutability);
                        
                        if (Hyperparams.useGlobalMutability) {
                            $('#mutation-rate').css('display', 'none');
                        }
                        else {
                            $('#mutation-rate').css('display', 'block');
                        }
                        
                        this.setMoveRangeVisibility();
                        
                        if (this.setBrainPanelVisibility()) {
                            this.setBrainDetails();
                            
                        }
                        $('#organism-details').css('display', 'block');
                    }

    setEditorPanel() {
        this.clearDetailsPanel();
        var org = this.env.organism;
        
        $('#species-name-edit').val(org.species.name);
        $('.cell-count').text("Cell count: "+org.anatomy.cells.length);
        if (this.setMoveRangeVisibility()){
            $('#move-range-edit').val(org.move_range);
        }
        
		$('#mutation-rate-edit').val(org.mutability);
        if (Hyperparams.useGlobalMutability) {
            $('#mutation-rate-cont').css('display', 'none');
        }
        else {
            $('#mutation-rate-cont').css('display', 'block');
        }
        
        if (this.setBrainPanelVisibility()){
            this.setBrainEditorValues($('#observation-type-edit').val());
        }
        
        $('#cell-selections').css('display', 'grid');
        $('#edit-organism-details').css('display', 'block');
    }
    
    setBrainPanelVisibility() {
        var org = this.env.organism;
        if (org.anatomy.has_eyes && org.anatomy.is_mover) {
            $('.brain-details').css('display', 'block');
            return true;
        }
        $('.brain-details').css('display', 'none');
        return false;
    }
    
    setBrainDetails() {
        var chase_types = [];
        var retreat_types = [];
        for(var cell_name in this.env.organism.brain.decisions) {
            var decision = this.env.organism.brain.decisions[cell_name];
            if (decision == 1) {
                retreat_types.push(cell_name)
            }
            else if (decision == 2) {
                chase_types.push(cell_name);
            }
        }
        $('.chase-types').text("Move Towards: " + chase_types);
        $('.retreat-types').text("Move Away From: " + retreat_types);
    }
    
    setMoveRangeVisibility() {
        var org = this.env.organism;
        if (org.anatomy.is_mover) {
            $('#move-range-cont').css('display', 'block');
            $('#move-range').css('display', 'block');
            return true;
        }
        $('#move-range-cont').css('display', 'none');
        $('#move-range').css('display', 'none');
        return false;
    }
    
    setBrainEditorValues(name) {
        $('#observation-type-edit').val(name);
        var reaction = this.env.organism.brain.decisions[name];
        $('#reaction-edit').val(reaction);
    }
    
    setRandomizePanel() {
        this.clearDetailsPanel();
        $('#randomize-organism-details').css('display', 'block');
    }
    
    loadSpeciesInEditor(org) {
        console.log("WE TRIED TO LOAD ORG");
        this.loadOrg(org);
        //     // Logic to load the organism into the editor based on the species name
        //     console.log(`Loading species: ${speciesName} into the editor.`);
        //     const organismDetails = getOrganismDetails(speciesName); // Replace with actual function
        //     if (organismDetails) {
            //         // Update editor fields or canvas
            //         document.getElementById('species-name-edit').value = speciesName;
            //         document.querySelector('.species-name').textContent = `Species Name: ${speciesName}`;
            //         document.querySelector('.cell-count').textContent = `Cell count: ${organismDetails.cellCount}`;
            //         // Additional editor updates...
            
            //     } else {
                //         console.error(`Species ${speciesName} not found.`);
                //     }
            }
            
            getOrganismDetails(anatomy) {
                //this.loadOrg()// Replace with actual retrieval logic
            }
            
        }
        
// window.EditorController = {
//     loadSpeciesInEditor,
// };
module.exports = EditorController;
