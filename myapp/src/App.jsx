import { useEffect, useRef, useState } from 'react'
import './App.css'

function RemoteVideo({ stream }) {
  const videoRef = useRef(null)

  useEffect(() => {
    videoRef.current.srcObject = stream


  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: 320, background: "black" }}
    />
  )
}


function App() {
  const wsREF = useRef(null)
  const peerWF = useRef(null)
  const [start, setstart] = useState(false)
  const localvideoWF = useRef(null)
  const localstreamWF = useRef(null)
  const remotevideoWF = useRef(null)
  const remotestreamWF = useRef(null)

  const PeerList = useRef([])
  const [remoteStreams, setRemoteStreams] = useState([])

  const [id, setid] = useState(0)

  async function createOffer(id) {
    console.log("create offer")
    setstart(true)

    console.log(PeerList.current)
    PeerList.current.map(async (peer) => {

      if (!localstreamWF.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        localstreamWF.current = stream


        if (localvideoWF.current) {
          localvideoWF.current.srcObject = stream
        }

        console.log("Local stream active:", stream.active)

        stream.getTracks().forEach((track) => {
          peer["peerObject"].addTrack(track, stream)

        })
      }


      peer["peerObject"].onconnectionstatechange = () => {
        console.log("Peer:", peer["peerObject"])
      }

      peer["peerObject"].oniceconnectionstatechange = () => {
        console.log("ICE:", peer["peerObject"])
      }

      peer["peerObject"].onicegatheringstatechange = () => {
        console.log("Gathering:", peer["peerObject"])
      }



      peer["peerObject"].onicecandidate = (e) => {
        wsREF.current.send(JSON.stringify({ type: "sendCandidate", candidate: e.candidate, socket : wsREF.current,target : peer["id"]}))
      }


      peer["peerObject"].ontrack = (e) => {
  console.log("RECEIVED TRACKS!")
  console.log("Track:", e.track.kind)
  console.log("Streams:", e.streams)

  const remoteStream = e.streams[0]

  if (!remoteStream) {
    console.log("No remote stream received")
    return
  }

  setRemoteStreams(prev => {
    const existing = prev.find(
      item => item.id === peer.id
    )

    if (existing) {
      return prev.map(item =>
        item.id === peer.id
          ? { ...item, stream: remoteStream }
          : item
      )
    }

    return [...prev, {
      id: peer.id,
      stream: remoteStream
    }]
  })

}

      const offer = await peer["peerObject"].createOffer()
      await peer["peerObject"].setLocalDescription(offer)


      wsREF.current.send(JSON.stringify({ type: "sendOffer", id: id, offer: offer , target_id : peer["id"] }))
    })



  }




  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const websocket = new WebSocket(`${wsProtocol}//${window.location.host}`)

    wsREF.current = websocket



    websocket.addEventListener("open", async () => {
      console.log('client open!')

      websocket.send(JSON.stringify({type : "addClient"}))

      websocket.addEventListener("message", async (e) => {
        const Data = JSON.parse(e.data)


        if (Data.type == "UpdateList") {
          const AvaliableUsers = []
          const filtered = Data.Users.filter(user => user["id"] !== Data.id)

          filtered.map((user) => {
            AvaliableUsers.push({
              id: user["id"], peerObject: new RTCPeerConnection(
                {
                  iceServers: [
                    { urls: "stun:stun4.l.google.com:19302" }
                  ]
                }
              )
            })
          })

          console.log(AvaliableUsers)
          PeerList.current = AvaliableUsers

        }

        if (Data.type == "receiveCandidate") {
          console.log("received ice candidate",Data.sender_id)

          const sender = PeerList.current.find(peer => peer["id"] == Data.sender_id)
          
          console.log(Data.candidate)


          await sender["peerObject"].addIceCandidate(Data.candidate)

        }

        if (Data.type == "returnID") {
          console.log(Data.id)
          setid(Data.id)


          websocket.send(JSON.stringify({ type: "returnAvaliableUsers", id: Data.id }))

        }

        if (Data.type == "receiveOffer") {
          if (start == false) {          setstart(true)}
          console.log("offer received")

            const Target = PeerList.current.find(
    peer => peer.id == Data.sender
  );

  if (!Target) {
    console.log("Peer not found:", Data.sender);
    return;
  }

  if (!localstreamWF.current) {
    localstreamWF.current =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

    if (localvideoWF.current) {
      localvideoWF.current.srcObject = localstreamWF.current;
    }
  }

  // Add local tracks to THIS peer connection
  localstreamWF.current.getTracks().forEach(track => {
    const exists = Target.peerObject.getSenders()
      .some(sender => sender.track === track);

    if (!exists) {
                      createOffer(id)
      Target.peerObject.addTrack(track, localstreamWF.current);
    }
  });


          await Target["peerObject"].setRemoteDescription(Data.offer)
          const answer = await Target["peerObject"].createAnswer()
          await Target["peerObject"].setLocalDescription(answer)
          console.log("TARGET",Target["id"])
          websocket.send(JSON.stringify({ type: "sendAnswer", answer: answer, sender: Target["id"]}))
        }

        if (Data.type == "receiveAnswer") {
          const Target = PeerList.current.find(peer => peer["id"] == Data.receiver)

          await Target["peerObject"].setRemoteDescription(Data.answer)

          console.log("received answer")

        }

      })


    })
  }, [])

  useEffect(() => {
    if (localvideoWF.current && localstreamWF.current) {
      localvideoWF.current.srcObject = localstreamWF.current;
    }
  }, [start]);




  return (
    <>
      <div>
        <button onClick={() => { setstart(true), createOffer(id) }}>start</button>


        {start == true && (
          <div>
            <video ref={localvideoWF} autoPlay playsInline muted></video>
            {remoteStreams.map(item => (
  <div key={item.id}>
    <p>Remote user: {item.id}</p>
    <RemoteVideo stream={item.stream} />
  </div>
))}
          </div>
        )

        }
      </div>
    </>
  )
}

export default App
