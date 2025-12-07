import { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";

// All available veggies
const veggies = [
  { name: "carrot", src: "/carrot.png" },
  { name: "apple", src: "/apple.png" },
  { name: "eggplant", src: "/eggplant.png" },
  { name: "lettuce", src: "/lettuce.png" },
];

export function App() {
  const [socket, setSocket] = useState(null);
  const [plants, setPlants] = useState([]);
  const [selected, setSelected] = useState(veggies[0]);

  const [harvestMode, setHarvestMode] = useState(false);
  const [pickedPlants, setPickedPlants] = useState([]);

  const [pendingPlant, setPendingPlant] = useState(null);
  const [messageText, setMessageText] = useState("");

  const [limitMessage, setLimitMessage] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const [email, setEmail] = useState("");

  // NEW: intro overlay state (shows on first load)
  const [showIntro, setShowIntro] = useState(true);

  // WebSocket connection
  useEffect(() => {
    let ws = new WebSocket("ws://localhost:3005/");
    setSocket(ws);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "welcome") {
        const list = (data.carrots || []).map((p) => ({
          ...p,
          justPlanted: false,
        }));
        setPlants(list);
      }

      if (data.type === "planted") {
        setPlants((prev) => [...prev, { ...data.carrot, justPlanted: true }]);
      }
    };
  }, []);

  // Show email overlay when exactly 3 veggies are picked
  useEffect(() => {
    if (pickedPlants.length === 3) {
      setShowOverlay(true);
    }
  }, [pickedPlants]);

  // PLANTING MODE — clicking the ground
  function handleGardenClick(e) {
    if (!socket) return;
    if (harvestMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPendingPlant({ x, y, src: selected.src });
  }

  // SUBMIT NEW PLANT
  function submitMessage(e) {
    e.preventDefault();

    if (!pendingPlant || !messageText.trim()) return;

    socket.send(
      JSON.stringify({
        type: "plant",
        x: pendingPlant.x,
        y: pendingPlant.y,
        src: pendingPlant.src,
        message: messageText,
      })
    );

    setPendingPlant(null);
    setMessageText("");
  }

  // HARVEST MODE — picking plants
  function pickPlant(index) {
    if (pickedPlants.length >= 3) {
      setLimitMessage(true);
      setTimeout(() => setLimitMessage(false), 1500);
      return;
    }

    const plant = plants[index];
    const remaining = plants.filter((_, i) => i !== index);

    setPlants(remaining);
    setPickedPlants((prev) => [...prev, plant]);
  }

  // EMAILJS — SEND EMAIL
  function handleEmailSubmit(e) {
    e.preventDefault();

    const templateParams = {
      user_email: email,
      email: email,
      message1: pickedPlants[0]?.message,
      message2: pickedPlants[1]?.message,
      message3: pickedPlants[2]?.message,
      veggie1: pickedPlants[0]?.src,
      veggie2: pickedPlants[1]?.src,
      veggie3: pickedPlants[2]?.src,
    };

    emailjs
      .send(
        "service_7sg33um",     // service ID
        "template_abz1drl",    // template ID
        templateParams,
        "0Hq-cDhQC97j9HILu"    // public key
      )
      .then(() => {
        alert("Your message to your future self has been sent 🌱💌");
        setShowOverlay(false);
        setEmail("");
        setPickedPlants([]);
      })
      .catch((err) => {
        console.error("Email error:", err);
        alert("There was a problem sending the email. Please try again.");
      });
  }

  return (
    <div
      id="garden"
      onClick={handleGardenClick}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        cursor: harvestMode
          ? "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><text y=%2224%22 font-size=%2224%22>🧺</text></svg>') 16 16, auto"
          : "pointer",
      }}
    >
      {/* RENDER ALL PLANTS */}
      {plants.map((p, i) => (
        <div
          key={i}
          onClick={(e) => {
            if (harvestMode) {
              e.stopPropagation();
              pickPlant(i);
            }
          }}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            cursor: harvestMode ? "grab" : "default",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "white",
              textShadow: "0 2px 6px rgba(0,0,0,0.5)",
              marginBottom: "4px",
              maxWidth: "120px",
              wordWrap: "break-word",
            }}
          >
            {p.message}
          </div>

          <img
            src={p.src}
            className={p.justPlanted ? "grow" : ""}
            onAnimationEnd={(e) => e.target.classList.remove("grow")}
            style={{
              width: "50px",
              transition: harvestMode ? "transform 0.2s" : "none",
            }}
          />
        </div>
      ))}

      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes growAnimation {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); }
          }
          .grow { animation: growAnimation 0.6s ease-out forwards; }
        `}
      </style>

      {/* VEGGIE PICKER */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          display: "flex",
          gap: "12px",
        }}
      >
        {veggies.map((v) => (
          <div
            key={v.name}
            onClick={(e) => {
              e.stopPropagation();
              setHarvestMode(false);
              setSelected(v);
            }}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background:
                selected.name === v.name && !harvestMode
                  ? "white"
                  : "rgba(255,255,255,0.6)",
              border:
                selected.name === v.name && !harvestMode
                  ? "3px solid #ff718bff"
                  : "2px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            <img src={v.src} style={{ width: "40px" }} />
          </div>
        ))}
      </div>

      {/* BASKET BUBBLE */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: harvestMode ? "white" : "rgba(255,255,255,0.6)",
          border: harvestMode ? "3px solid #ff88cc" : "2px solid white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setHarvestMode(!harvestMode);
        }}
      >
        🧺
      </div>

      {/* MESSAGE INPUT POPUP */}
      {pendingPlant && !harvestMode && (
        <form
          onSubmit={submitMessage}
          style={{
            position: "absolute",
            left: pendingPlant.x,
            top: pendingPlant.y,
            transform: "translate(-50%, -120%)",
            background: "white",
            padding: "10px 14px",
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            display: "flex",
            gap: "10px",
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Write a message..."
            style={{
              padding: "8px 10px",
              border: "2px solid #d8d8ff",
              borderRadius: "10px",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 14px",
              background: "#ff88cc",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Plant
          </button>
        </form>
      )}

      {/* LIMIT WARNING */}
      {limitMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "90px",
            right: "30px",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            fontWeight: "600",
          }}
        >
          Only 3 allowed 💗
        </div>
      )}

      {/* EMAIL OVERLAY MODAL (after harvesting 3) */}
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              width: "420px",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginBottom: "10px" }}>Your Harvest 🌱</h2>
            <p
              style={{
                marginBottom: "20px",
                fontSize: "15px",
                lineHeight: "1.5",
              }}
            >
              These are the three messages you harvested.
              <br />
              They represent what you want to nurture in your life.
              <br />
              You’ll receive them again one year from now,
              <br />
              as a gentle reminder to keep growing.
            </p>

            {pickedPlants.map((p, i) => (
              <div key={i} style={{ marginBottom: "15px" }}>
                <img src={p.src} style={{ width: "40px" }} />
                <div style={{ marginTop: "6px", fontWeight: 600 }}>
                  {p.message}
                </div>
              </div>
            ))}

            <form onSubmit={handleEmailSubmit} style={{ marginTop: "10px" }}>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "2px solid #ccc",
                  marginBottom: "10px",
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#ff718bff",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Send to my future self
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INTRO OVERLAY – shows on first load */}
      {showIntro && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100, // above everything
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.97)",
              padding: "28px 30px 26px",
              width: "460px",
              borderRadius: "24px",
              boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
              textAlign: "left",
            }}
          >
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                marginBottom: "10px",
              }}
            >
              "You reap what you sow"
            </h1>

            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.5",
                marginBottom: "16px",
              }}
            >
              Welcome to your collaborative intention garden.
              Here, every seed you plant contains a message that grows with time.
              Choose a vegetable or fruit, write a thought, and plant it in the
              garden. Other visitors can harvest three of these messages and send
              them to their future selves.
            </p>

            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
                marginBottom: "18px",
              }}
            >
              <strong>How it works:</strong>
              <ul
                style={{
                  paddingLeft: "18px",
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                <li>Pick a vegetable at the bottom of the screen.</li>
                <li>Click anywhere in the garden to plant it.</li>
                <li>Write a message you want to grow over time.</li>
                <li>
                  Click the basket 🧺 to collect 3 intentions and send them to
                  your future self.
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowIntro(false)}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "10px 14px",
                background: "#008a2eff",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Enter the garden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
