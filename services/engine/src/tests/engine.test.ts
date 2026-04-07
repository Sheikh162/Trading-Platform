import { describe, expect, it, vi } from "vitest";
import { CREATE_ORDER } from "@trading-platform/shared-types";
import { Engine } from "../trade/Engine";
import { Orderbook } from "../trade/Orderbook";

vi.mock("../RedisManager", () => ({
    RedisManager: {
      getInstance: () => ({
        publishMessage: vi.fn(),
        sendToApi: vi.fn(),
        pushMessage: vi.fn()
      })
    }
}));


describe("Engine", () => {
    //TODO: How to test the singleton class RedisManager directly?
    it("Publishes Trade updates", () => {
        const engine = new Engine();
        engine.addOrderbook(new Orderbook("TATA", [], [], 0, 0));
        engine.createUser("1");
        engine.createUser("2");
        (engine as any).balances.get("1").USDT.available = 2000;
        (engine as any).balances.get("2").TATA = {
            available: 1,
            locked: 0,
        };
        const publishSpy = vi.spyOn(engine, "publishWsTrades");
        engine.process({
            message: {
                type: CREATE_ORDER,
                data: {
                    market: "TATA_USDT",
                    price: "1000",
                    quantity: "1",
                    side: "buy",
                    userId: "1"
                }
            },
            clientId: "1"
        });

        engine.process({
            message: {
                type: CREATE_ORDER,
                data: {
                    market: "TATA_USDT",
                    price: "1001",
                    quantity: "1",
                    side: "sell",
                    userId: "2"
                }
            },
            clientId: "1"
        });
        
        expect(publishSpy).toHaveBeenCalledTimes(2);

    });
});
