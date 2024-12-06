import { useCallback, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import clsx from "clsx";

const socket = io("http://localhost:3001");

type Player = {
  id: string;
  x: number;
  y: number;
  color: string | void;
};

const Agar = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const meRef = useRef<Player | null>(null);
  const refs = useRef(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  const setRef = (id: string, el: HTMLDivElement | null) => {
    refs.current.set(id, el);
  };

  const draw = useCallback(() => {
    players.forEach((p) => {
      const ref = refs.current.get(p.id) as HTMLDivElement;
      if (ref) {
        ref.style.top = `${p.y}px`;
        ref.style.left = `${p.x}px`;
      }
    });
  }, [players]);

  useEffect(() => {
    socket.on("new-player", (data) => {
      setPlayers((prev) => {
        return data.players.reduce((acc: Player[], next: Player) => {
          const exist = prev.find(({ id }) => id === next.id);
          if (exist) {
            return [...acc, exist];
          }
          return [...acc, { id: next.id, x: 0, y: 0, color: next.color }];
        }, [] as Player[]);
      });
    });
    return () => {
      socket.off("new-player");
    };
  }, []);

  useEffect(() => {
    socket.emit("register");
    socket.on("register-ok", (data) => {
      const width = window.innerWidth / 2;
      const height = window.innerHeight / 2;
      meRef.current = { id: data.id, x: width, y: height, color: data.color };
      if (meRef.current) {
        setPlayers([meRef.current]);
      }
    });
    return () => {
      socket.off("register-ok");
    };
  }, []);

  useEffect(() => {
    socket.on("ennemy-move", (data) => {
      setPlayers((prev) => {
        return prev.map((p) => {
          if (p.id === data.id) {
            return { ...p, x: data.x, y: data.y };
          }
          return p;
        });
      });
    });
    return () => {
      socket.off("ennemy-move");
    };
  }, []);

  useEffect(() => {
    draw();
  }, [draw, players]);

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridSize = 50;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.strokeStyle = "#ddd";
      ctx.stroke();
    }

    for (let i = 0; i < width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.strokeStyle = "#ddd";
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawGrid();

    const interval = setInterval(() => {
      drawGrid();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateCameraPosition = () => {
    if (meRef.current) {
      setCamera({
        x: meRef.current.x - window.innerWidth / 2,
        y: meRef.current.y - window.innerHeight / 2,
      });
    }
  };

  useEffect(() => {
    const handlePlayerMove = (e: MouseEvent) => {
      if (meRef.current) {
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === socket.id) {
              const newMe = { ...p, y: e.clientY, x: e.clientX };
              meRef.current = newMe;
              socket.emit("move", newMe);
              return newMe;
            }
            return p;
          })
        );
        updateCameraPosition();
      }
    };

    document.body.addEventListener("click", handlePlayerMove);
    return () => {
      document.body.removeEventListener("click", handlePlayerMove);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 z-0"
        width={window.innerWidth}
        height={window.innerHeight}
      ></canvas>

      <div className="relative z-10">
        {players.map((p) => {
          return (
            <div
              className={clsx(
                `transition-all duration-1000 absolute w-[30px] h-[30px] rounded-[15px]`
              )}
              style={{
                backgroundColor: p.color ?? "",
                top: `${p.y - camera.y - 15}px`,
                left: `${p.x - camera.x - 15}px`,
              }}
              ref={(el) => setRef(p.id, el)}
              key={p.id}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

export default Agar;
