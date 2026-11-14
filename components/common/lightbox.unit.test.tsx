import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "@jest/globals";

import { Lightbox, type LightboxImage } from "./lightbox";

const images: LightboxImage[] = [
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

function LightboxHarness({ startIndex = 0 }: { startIndex?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open photos
      </button>
      <Lightbox
        images={images}
        startIndex={startIndex}
        open={open}
        onOpenChange={setOpen}
        title="Listing photos"
        altPrefix="Unit 204 image"
      />
    </>
  );
}

function openLightbox(startIndex?: number) {
  render(<LightboxHarness startIndex={startIndex} />);
  const opener = screen.getByRole("button", { name: "Open photos" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

function getStatus() {
  return screen.getByText(/^Image \d of 3/);
}

describe("Lightbox", () => {
  it("opens as a named dialog on the start image", () => {
    openLightbox(1);

    screen.getByRole("dialog", { name: "Listing photos" });
    expect(getStatus()).toHaveTextContent("Image 2 of 3: Roll-in shower");
    screen.getByText("2 / 3");
    expect(screen.getByRole("img", { name: "Roll-in shower" })).toBeVisible();
  });

  it("uses the alt prefix when an image has no caption", () => {
    openLightbox(2);

    expect(getStatus()).toHaveTextContent(/^Image 3 of 3$/);
    screen.getByRole("img", { name: "Unit 204 image 3 of 3" });
  });

  it("hides the other images from assistive technology", () => {
    openLightbox(0);

    expect(screen.getAllByRole("img")).toHaveLength(1);
    screen.getByRole("img", { name: "Kitchen" });
  });

  it("moves between images with the arrow buttons and wraps at the ends", () => {
    openLightbox(0);

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(getStatus()).toHaveTextContent("Image 2 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(getStatus()).toHaveTextContent("Image 3 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(getStatus()).toHaveTextContent("Image 1 of 3");
  });

  it("moves between images with the arrow keys", () => {
    openLightbox(0);
    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(getStatus()).toHaveTextContent("Image 3 of 3");

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(getStatus()).toHaveTextContent("Image 2 of 3");
  });

  it("starts again at startIndex each time it opens", () => {
    openLightbox(1);
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Open photos" }));
    expect(getStatus()).toHaveTextContent("Image 2 of 3");
  });

  it("moves focus into the dialog and returns it to the opener when closed with the close button", async () => {
    const opener = openLightbox(0);

    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes on Escape and returns focus to the opener", async () => {
    const opener = openLightbox(0);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("hides the arrow buttons when there is only one image", () => {
    render(
      <Lightbox images={images.slice(0, 1)} open onOpenChange={() => {}} title="Listing photos" />,
    );

    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    screen.getByText("1 / 1");
  });
});
