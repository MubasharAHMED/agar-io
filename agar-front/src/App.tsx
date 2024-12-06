import { useCallback, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import clsx from "clsx";

const socket = io("http://localhost:3001");

type Player = {
  id: string;
  x: number;
  y: number;
  color: string | void;
  radius?: number;
};

type Food = {
  id: string;
  x: number;
  y: number;
  color: string | void;
};

const Agar = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const meRef = useRef<Player | null>(null);
  const refsPlayers = useRef(new Map());
  const refsFoods = useRef(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setRefPlayer = (id: string, el: HTMLDivElement | null) => {
    refsPlayers.current.set(id, el);
  };

  const setRefFoods = (id: string, el: HTMLDivElement | null) => {
    refsFoods.current.set(id, el);
  };

  const drawPlayers = useCallback(() => {
    players.forEach((p) => {
      const ref = refsPlayers.current.get(p.id) as HTMLDivElement;
      if (ref) {
        ref.style.top = `${p.y}px`;
        ref.style.left = `${p.x}px`;
      }
    });
  }, [players]);

  const drawFoods = useCallback(() => {
    foods.forEach((f) => {
      const ref = refsFoods.current.get(f.id) as HTMLDivElement;
      if (ref) {
        ref.style.top = `${f.y}px`;
        ref.style.left = `${f.x}px`;
      }
    });
  }, [foods]);

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

      socket.emit("screen-size", { width, height });
    });
    return () => {
      socket.off("register-ok");
    };
  }, []);

  useEffect(() => {
    socket.on("update-food", (newFoods) => {
      setFoods((prev) => {
        const foodMap = new Map(prev.map((food) => [food.id, food])); // map des anciens aliments
        newFoods.foods.forEach((food: Food) => {
          foodMap.set(food.id, food); // Ajoute ou met à jour les aliments
        });
        return Array.from(foodMap.values());
      });
    });

    return () => {
      socket.off("update-food");
    };
  }, [foods]);

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
    drawPlayers();
  }, [drawPlayers, players]);

  useEffect(() => {
    drawFoods();
  }, [drawFoods, foods]);

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
                `transition-all duration-1000 absolute w-[30px] h-[30px] rounded-full`
              )}
              style={{
                backgroundColor: p.color ?? "",
                top: `${p.y}px`,
                left: `${p.x}px`,
              }}
              ref={(el) => setRefPlayer(p.id, el)}
              key={p.id}
            ></div>
          );
        })}
      </div>

      <div className="relative z-10">
        {foods.map((f) => {
          return (
            <div
              key={f.id}
              className="transition-all duration-1000 absolute w-[30px] h-[30px] rounded-full"
              ref={(el) => setRefFoods(f.id, el)}
              style={{
                backgroundColor: f.color ?? "",
                top: `${f.y}px`,
                left: `${f.x}px`,
              }}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

export default Agar;
