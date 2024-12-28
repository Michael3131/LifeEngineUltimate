const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class PopulationChartLog extends ChartController {
    constructor() {
        super("Population at Log Scale");
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "pop1",
                legendText: "Total Population Log",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.pop_counts[i];
        // TODO Michael, have a toggle for if I want to see this as log scale or not. 
        // Simply apply a log to p and see if that works :)
        this.data[0].dataPoints.push({x:t, y:Math.log10(p)});
    }
}

module.exports = PopulationChartLog;