import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "@jest/globals";

import { ListingImageCarousel } from "./ListingImageCarousel";

const images = [
  { url: "/photos/kitchen.jpg", caption: "Kitchen" },
  { url: "/photos/bathroom.jpg", caption: "Roll-in shower" },
  { url: "/photos/entrance.jpg", caption: "" },
];

// Embla needs browser APIs that jsdom doesn't provide.
beforeAll(() => {
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(window, {
    ResizeObserver: ObserverStub,
    IntersectionObserver: ObserverStub,
  });
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

function renderCarousel() {
  render(<ListingImageCarousel images={images} altPrefix="12 King St" />);
}

describe("ListingImageCarousel", () => {
  it("makes only the shown photo a button that says it opens a larger view", () => {
    renderCarousel();

    const buttons = screen.getAllByRole("button", { name: /larger$/ });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("View image 1 of 3 larger");
  });

  it("opens the shown photo in a full-screen lightbox", () => {
    renderCarousel();

    fireEvent.click(screen.getByRole("button", { name: "View image 1 of 3 larger" }));

    const dialog = screen.getByRole("dialog", { name: "Photos of 12 King St" });
    within(dialog).getByText("Image 1 of 3: Kitchen");
    within(dialog).getByRole("img", { name: "Kitchen" });
  });

  it("uses the address for alt text in the lightbox when a photo has no caption", () => {
    renderCarousel();

    fireEvent.click(screen.getByRole("button", { name: "View image 1 of 3 larger" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });

    within(dialog).getByRole("img", { name: "12 King St image 3 of 3" });
  });

  it("returns focus to the photo when the lightbox closes", async () => {
    renderCarousel();
    const photo = screen.getByRole("button", { name: "View image 1 of 3 larger" });
    photo.focus();

    fireEvent.click(photo);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(photo).toHaveFocus());
  });
});
