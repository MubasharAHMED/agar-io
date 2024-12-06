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

  const setRef = (id: string, el: HTMLDivElement | null) => {
    refs.current.set(id, el);
  };

  console.log(players);

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
      console.log("playerlist", data);
      setPlayers((prev) => {
        return data.players.reduce((acc: Player[], next: Player) => {
          const exist = prev.find(({ id }) => id === next.id);
          console.log(exist, "???", socket.id);
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
      console.log("register-ok");
      meRef.current = { x: 0, y: 0, ...data };
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
      console.log("ennemy move", data);
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

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (meRef.current) {
        //@ts-ignore
        setPlayers((prev) => {
          return prev.map((p) => {
            if (p.id === socket.id) {
              console.log("x", e.clientX);
              const newMe = { ...p, y: e.clientY, x: e.clientX };
              meRef.current = newMe;
              socket.emit("move", newMe);
              return newMe;
            }
            return p;
          }, []);
        });
      }
    };

    document.body.addEventListener("click", clickHandler);
    return () => {
      document.body.removeEventListener("click", clickHandler);
    };
  }, []);

  return (
    <div>
      {players.map((p) => {
        return (
          <div
            className={clsx(
              `transition-all duration-1000 absolute w-[30px] h-[30px] rounded-[15px]`
            )}
            style={{ backgroundColor: p.color ?? "" }}
            ref={(el) => setRef(p.id, el)}
            key={p.id}
          ></div>
        );
      })}
    </div>
  );
};

export default Agar;
