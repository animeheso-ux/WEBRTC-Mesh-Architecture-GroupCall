import express from "express"
import {exec} from "node:child_process"

import path from "path"
import http from "http"

import { fileURLToPath } from "node:url"


import { websocketSetup } from "./websocket.js"

const app = express()
const PORT = 3000


const server = http.createServer(app)


websocketSetup(server)


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

app.use(express.json())
app.use(express.static(path.join(dirname,"myapp/dist")))






app.get("/{*path}",(req,res)=> {
    res.sendFile(path.join(dirname,"myapp/dist","index.html"))
})


exec( "cd myapp && npm run build" ,(err)=> {
    if (err) {
        console.log(err)
    }

    console.log("react loaded")
})


server.listen(3000,() => console.log(`http://localhost:${PORT}`))