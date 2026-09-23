import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MapView } from "./MapView";

jest.mock("@vis.gl/react-maplibre", () => ({
  Map: ({ onError }: { onError: (event: { error: Error }) => void }) => (
    <div aria-label="Map">
      <button
        onClick={() =>
          onError({
            error: Object.assign(new Error("WebGL2 unavailable"), {
              name: "GPUInitializationError",
            }),
          })
        }
      >
        Fail initialization
      </button>
      <button onClick={() => onError({ error: new Error("Tile request failed") })}>
        Fail tile request
      </button>
    </div>
  ),
}));

jest.mock("../listings-card/ListingsCard", () => ({ ListingsCard: () => null }));

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe("MapView", () => {
  it("directs users to List view when WebGL initialization fails", () => {
    render(<MapView listings={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Fail initialization" }));

    expect(screen.getByRole("status").textContent).toContain("Switch to List view");
    expect(screen.queryByLabelText("Map")).toBeNull();
  });

  it("keeps the map mounted when a tile request fails", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<MapView listings={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Fail tile request" }));

    screen.getByLabelText("Map");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
