import type { ReactNode } from "react";
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { Listing } from "@/components/listing-card-list/ListingsCardList";
import { MapView } from "./MapView";

jest.mock("@vis.gl/react-maplibre", () => ({
  Map: ({
    onError,
    children,
  }: {
    onError: (event: { error: Error }) => void;
    children?: ReactNode;
  }) => (
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
      {children}
    </div>
  ),
  // Like the real Marker, clicks anywhere inside the marker element reach onClick.
  Marker: ({
    onClick,
    children,
  }: {
    onClick: (event: { originalEvent: MouseEvent }) => void;
    children?: ReactNode;
  }) => <div onClick={(event) => onClick({ originalEvent: event.nativeEvent })}>{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

jest.mock("../listings-card/ListingsCard", () => ({ ListingsCard: () => null }));

const LISTING: Listing = {
  id: "11111111-1111-4111-8111-111111111111",
  price: 1250,
  address: "12 King St",
  city: "Waterloo",
  beds: 2,
  baths: 1,
  sqft: 800,
  lat: 43.46,
  lng: -80.52,
  timeAgo: "2 days ago",
};

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

  it("renders each price pin as a button named by price and address", () => {
    render(<MapView listings={[LISTING]} />);

    const pin = screen.getByRole("button", { name: "$1,250 per month, 12 King St, Waterloo" });
    expect(pin.getAttribute("aria-haspopup")).toBe("dialog");
    expect(pin.getAttribute("aria-expanded")).toBe("false");
  });

  it("moves focus into the listing when a pin opens it, and back to the pin on Escape", async () => {
    render(<MapView listings={[LISTING]} />);
    const pin = screen.getByRole("button", { name: /per month/ });

    fireEvent.click(pin);

    expect(pin.getAttribute("aria-expanded")).toBe("true");
    // jsdom applies no CSS, so both the popup and the bottom card render; focus goes to one of them.
    const dialogs = screen.getAllByRole("dialog", { name: "Listing at 12 King St, Waterloo" });
    await waitFor(() => expect(dialogs).toContain(document.activeElement));

    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(pin);
  });

  it("closes the listing from its close button", () => {
    render(<MapView listings={[LISTING]} />);
    const pin = screen.getByRole("button", { name: /per month/ });
    fireEvent.click(pin);

    const [closeButton] = screen.getAllByRole("button", { name: "Close listing" });
    fireEvent.click(closeButton as HTMLElement);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(pin);
  });
});
