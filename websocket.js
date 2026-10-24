
import express from "express"
import { WebSocketServer } from "ws"


let Users = []


const websocketRouter = express.Router()


function createRandomId() {
    let id = ""
    for (let i = 0 ;i < 5 ;i++) {
        const num = Math.floor(Math.random() * 9).toString()
        id += num
    }

    return id
}


export function websocketSetup(server) {
    const wsServer = new WebSocketServer({server})


    wsServer.on("connection",(ws)=> {
        console.log("server online!")

        ws.on("close",(e)=> {
            console.log("client left")
        })


        ws.on("message",(e)=> {
            const Data = JSON.parse(e)

            if (Data.type == "addClient") {
                const id = createRandomId()
                Users.push({ws : ws,id : id})

                ws.send(JSON.stringify({type : "returnID",id : id}))

            }

            if (Data.type == "returnAvaliableUsers") {
                const remainingUsers = Users.filter(user => user["id"] !== Data.id)

                ws.send(JSON.stringify({type : "UpdateList",Users : Users,id : Data.id}))


                remainingUsers.forEach((user)=> {
                    user["ws"].send(JSON.stringify({type : "UpdateList", id : user["id"],Users : Users}))
                })
            }

        

            if (Data.type == "sendCandidate") {
                const otherusers = Users.find(user => user["ws"] !== ws)
                const sender = Users.find(user => user["ws"] == ws)
                

                if (otherusers) {

                        otherusers["ws"].send(JSON.stringify({type : "receiveCandidate",candidate : Data.candidate,sender_id : sender["id"]}))


                }
            }

            if (Data.type == "sendOffer") {
                console.log("sender",Data.id)
                const otherusers = Users.find(user => user["id"] == Data.target_id)

                if (otherusers) {
                    otherusers["ws"].send(JSON.stringify({type : "receiveOffer",offer : Data.offer,sender: Data.id}))
                }
            }

            if (Data.type == "sendAnswer") {
                                const otherusers = Users.find(user => user["id"] == Data.sender)

    const sender = Users.find(
        user => user.ws === ws
    )

                if (otherusers) {
                    otherusers["ws"].send(JSON.stringify({type : "receiveAnswer",answer : Data.answer,receiver : sender.id}))
                }
            }
        })
    })


}





export default websocketRouter