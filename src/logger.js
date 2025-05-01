import {appendFile,openSync} from "fs";
import { DeliverooMap } from "./belief/deliverooMap.js";

/**
 * 
 * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
 * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
 * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE" 
 * @returns A formatted string
 */
function writeTime(time=null, type=null){
    let s
    if(type=="ms"){ s = time.ms + "ms"}
    else if(type == "frame"){ s = "FRAME " + time.frame}
    else if(type == "number"){ s = ""+time }
    else if(type == "canonical"){ 
        s = "FRAME " + time.frame + " - " + time.ms + "ms"
    }
    else{ s = "UNDEFINED TYPE" }
    return s
}

class Log {
    #_config = openSync("logs/config.txt","w",null)
    #me = openSync("logs/me.txt","w",null)
    #world = openSync("logs/world.txt","w",null)
    #parcels = openSync("logs/parcels.txt","w",null)
    #agents = openSync("logs/agents.txt","w",null)
    #decisionObjects = openSync("logs/decisionObjects.txt","w",null)
    #others = openSync("logs/others.txt","w",null)

    //constructor(){
    //    this._config = openSync("config.txt","w",null)
    //}

    /**
     * 
     * @param {Object} config Configuration object
     */
    logConfig(config) {
        //let str = JSON.stringify(config)
        let str = `PORT:${config.PORT}\n`
        str += `MAP_FILE:${config.MAP_FILE}\n`
        str += `PARCELS_GENERATION_INTERVAL:${config.PARCELS_GENERATION_INTERVAL}\n`
        str += `PARCELS_MAX:${config.PARCELS_MAX}\n`
        str += `PARCEL_REWARD:${config.PARCEL_REWARD}\n`
        str += `PARCEL_REWARD_VARIANCE:${config.PARCEL_REWARD_VARIANCE}\n`
        str += `PARCEL_DECADING_INTERVAL:${config.PARCEL_DECADING_INTERVAL}\n`
        str += `PENALTY:${config.PENALTY}\n`
        str += `MOVEMENT_STEPS:${config.MOVEMENT_STEPS}\n`
        str += `MOVEMENT_DURATION:${config.MOVEMENT_DURATION}\n`
        str += `AGENTS_OBSERVATION_DISTANCE:${config.AGENTS_OBSERVATION_DISTANCE}\n`
        str += `PARCELS_OBSERVATION_DISTANCE:${config.PARCELS_OBSERVATION_DISTANCE}\n`
        str += `AGENT_TIMEOUT:${config.AGENT_TIMEOUT}\n`
        str += `RANDOMLY_MOVING_AGENTS:${config.RANDOMLY_MOVING_AGENTS}\n`
        str += `RANDOM_AGENT_SPEED:${config.RANDOM_AGENT_SPEED}\n`
        str += `CLOCK:${config.CLOCK}\n`
        str += `BROADCAST_LOGS:${config.BROADCAST_LOGS}\n`
        str += `PLUGINS:${JSON.stringify(config.PLUGINS)}\n`
        str += `AGENT_TYPE:${config.AGENT_TYPE}\n\n`
        appendFile(this.#_config,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {Object} me Information about agent using OnYou 
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     */
    logMe (me,time=null,type=null){
        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n`
        str += `id:${me.id}\n`
        str += `name:${me.name}\n`
        str += `teamId:${me.teamId}\n`
        str += `teamName:${me.teamName}\n`
        str += `position:{${me.x},${me.y}}\n`
        str += `score:${me.score}\n`
        str += `penalty:${me.penalty}\n\n`
        appendFile(this.#me,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {Number} nrow Number of map rows
     * @param {Number} ncol Number of map columns
     * @param {DeliverooMap} delMap Current belief map 
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     */
    logMap(nrow,ncol,delMap,time=null,type=null){
        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n`
        for(let i=ncol-1; i>=0; i--){
            for(let j=0; j<nrow; j++){
                str += delMap.map[j][i]+" "
            }
            str += `\n`
        }
        str += `\n`
        appendFile(this.#world,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {Map} parcels Current parcel belief 
     * @param {Number} xpos Agent x position
     * @param {Number} ypos Agent y position
     * @param {DeliverooMap} delMap Current belief map 
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     * @returns 
     */
    logParcelSensed(parcels,xpos,ypos,delMap,time=null,type=null){
        if(xpos==undefined || ypos==undefined || delMap.map.length === 0){
            return
        }

        let par = Array.from(
            parcels.values()
        ).filter(a => a.carriedBy == null)
        par.sort((a,b)=>{
            if(a.y == b.y){return a.x - b.x}
            else {return b.y - a.y}
        })

        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n`
        const ncol = delMap.height
        const nrow = delMap.width

        if(par.length > 0){
            for(let i in par){
                str += JSON.stringify(par[i]) + "\n"
            }
        }
        else{ str += "NO PARCEL\n" }

        for(let i=ncol-1; i>=0; i--){
            for(let j=0; j<nrow; j++){

                if(j==xpos && i==ypos){ str += "#\t"}
                else if(par.length>0 && par[0].x == j && par[0].y == i){
                    str += `>${par[0].reward.toString().padEnd(3," ")}\t`
                    par.shift()
                }
                else{ str += delMap.map[j][i]+"\t" }
            }
            str += `\n`
        }
        str += "\n"
        appendFile(this.#parcels,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {Map} agents Current other agents belief 
     * @param {Number} xpos Agent x position
     * @param {Number} ypos Agent y position
     * @param {DeliverooMap} delMap Current belief map 
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     * @returns 
     */
    logAgentsSensed(agents,xpos,ypos,delMap,time=null,type=null){
        if(xpos==undefined || ypos==undefined || delMap.map.length === 0){
            return
        }

        let ag = Array.from(agents.values())
        ag.sort((a,b)=>{
            if(a.y == b.y){return a.x - b.x}
            else {return b.y - a.y}
        })

        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n`
        const ncol = delMap.height
        const nrow = delMap.width

        if(ag.length > 0){
            for(let i in ag){
                str += JSON.stringify(ag[i]) + "\n"
            }
        }
        else{ str += "NO AGENT\n" }

        for(let i=ncol-1; i>=0; i--){
            for(let j=0; j<nrow; j++){

                if(j==xpos && i==ypos){ str += "#\t"}
                else if(ag.length>0 && ag[0].x == j && ag[0].y == i){
                    str += `×\t`
                    ag.shift()
                }
                else{ str += delMap.map[j][i]+"\t" }
            }
            str += `\n`
        }
        str += "\n"
        appendFile(this.#agents,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {*[]} objectArray Object array modelling decisions (options or intentions)
     * @param {string} signalString String to print to distinguish between different call of the function. New line character not necessary
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     */
    logDecisions(objectArray,signalString,time=null,type=null){
        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n${signalString}\n`
        if(objectArray.length>0){
            for(let i in objectArray){
                str += JSON.stringify(objectArray[i])+"\n"
            }
        }
        else{
            str += "NO ELEMENT IN ARRAY RIGHT NOW\n"
        }
        str += "\n"

        appendFile(this.#decisionObjects,str,null,(e)=>{if(e)throw e})
    }

    /**
     * 
     * @param {*} signalString String used to distiguish between calls. New line character not necessary
     * @param {*?} time Information about the time. One can use anything, but `{"frame","ms"}` is the better supported one
     * @param {string?} type By putting in `time` the default object `{"frame","ms"}` you can use "ms", "frame" and "canonical". 
     * Otherwise you can put "number" and it will directly print the `time` parameter. Any other string will return "UNDEFINED TYPE"  
     */
    logOthers(signalString,time=null,type=null){
        let s = writeTime(time,type)
        let str = `AT TIME ${s}:\n${signalString}\n\n`

        appendFile(this.#others,str,null,(e)=>{if(e)throw e})
    }
}

const logger = new Log()

export {logger}