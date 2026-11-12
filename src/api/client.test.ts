import { beforeEach, describe, expect, it, vi } from "vitest";

// Implementação trocável por teste; as chamadas ficam registradas em `invoke`.
let respond: () => Promise<unknown> = async () => null;
const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => {
    invoke(...args);
    return respond();
  },
  isTauri: () => true,
}));

import { ApiError, call } from "./client";
import { getSetting, setSetting } from "./settings";

async function failure(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected the call to fail");
}

describe("api/client (001 RF-7, RF-8)", () => {
  beforeEach(() => invoke.mockReset());

  it("repassa comando e argumentos ao backend", async () => {
    respond = async () => "dark";
    expect(await getSetting("theme")).toBe("dark");
    expect(invoke).toHaveBeenCalledWith("get_setting", { key: "theme" });

    respond = async () => null;
    await setSetting("theme", "light");
    expect(invoke).toHaveBeenCalledWith("set_setting", {
      key: "theme",
      value: "light",
    });
  });

  it("erro do backend vira ApiError com code e message", async () => {
    respond = () => Promise.reject({ code: "db", message: "disk is full" });
    const err = await failure(call("get_setting", { key: "x" }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("db");
    expect(err.message).toBe("disk is full");
  });

  it("falha em formato inesperado também vira ApiError", async () => {
    respond = () => Promise.reject("boom");
    const err = await failure(call("anything"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("boom");
  });
});
