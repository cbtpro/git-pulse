import { useEffect, useState } from "react";
import { PageModal as Modal } from "../src/components/routing/PageModal";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { expect, it, vi } from "vitest";
import {
  PageStateProvider,
  RetainedRoutes,
  usePageDestination,
} from "../src/components/routing/PageState";

function Navigation() {
  const destination = usePageDestination(),
    navigate = useNavigate(),
    location = useLocation();
  return (
    <nav>
      <output aria-label="current url">
        {location.pathname + location.search}
      </output>
      {["/a", "/b"].map((path) => (
        <button
          key={path}
          onClick={() => {
            const target = destination(path);
            navigate(target.to, { state: target.state });
          }}
        >
          {path}
        </button>
      ))}
      <button onClick={() => navigate("/a?q=vue&page=3")}>another query</button>
      <button onClick={() => navigate(-1)}>history back</button>
      <button onClick={() => navigate(1)}>history forward</button>
      <button
        onClick={() =>
          navigate("/a?q=react&page=2", {
            state: { aggregateSearch: true, selection: "new selection" },
          })
        }
      >
        new search intent
      </button>
    </nav>
  );
}
function Editor({ name, mounted }: { name: string; mounted: () => void }) {
  const location = useLocation();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(mounted, [mounted]);
  return (
    <>
      <output aria-label="selection">
        {location.state?.selection || "none"}
      </output>
      <label>
        {name}
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button onClick={() => setOpen(true)}>open {name}</button>
      <Modal
        visible={open}
        title={`edit ${name}`}
        footer={null}
        onCancel={() => setOpen(false)}
      >
        <input aria-label={`modal ${name}`} />
      </Modal>
    </>
  );
}
function Fixture({ mounted }: { mounted: () => void }) {
  const [account, setAccount] = useState("first");
  return (
    <MemoryRouter
      initialEntries={["/a?q=react&page=2"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <button onClick={() => setAccount("second")}>switch account</button>
      <PageStateProvider key={account}>
        <Navigation />
        <main id="main-content" tabIndex={-1}>
          <RetainedRoutes>
            <Route
              path="/a"
              element={<Editor name="A draft" mounted={mounted} />}
            />
            <Route
              path="/b"
              element={<Editor name="B draft" mounted={mounted} />}
            />
          </RetainedRoutes>
        </main>
      </PageStateProvider>
    </MemoryRouter>
  );
}
it("retains local input and URL filters, mounts each visited page only once, and hides inactive content", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const mounted = vi.fn(),
    user = userEvent.setup();
  render(<Fixture mounted={mounted} />);
  await user.type(
    screen.getByRole("textbox", { name: "A draft" }),
    "unfinished search",
  );
  await user.click(screen.getByRole("button", { name: "/b" }));
  expect(screen.queryByRole("textbox", { name: "A draft" })).toBeNull();
  await user.type(
    screen.getByRole("textbox", { name: "B draft" }),
    "another draft",
  );
  await user.click(screen.getByRole("button", { name: "/a" }));
  expect(screen.getByLabelText("current url").textContent).toBe(
    "/a?q=react&page=2",
  );
  expect(screen.getByRole("textbox", { name: "A draft" })).toHaveProperty(
    "value",
    "unfinished search",
  );
  expect(mounted).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole("button", { name: "/b" }));
  expect(screen.getByRole("textbox", { name: "B draft" })).toHaveProperty(
    "value",
    "another draft",
  );
});

it("keeps query variants as the same original DOM instances across Back and Forward", async () => {
  const user = userEvent.setup(),
    mounted = vi.fn();
  render(<Fixture mounted={mounted} />);
  const first = screen.getByRole("textbox", { name: "A draft" });
  const firstFrame = first.closest<HTMLElement>("[data-route-page]")!;
  await user.type(first, "first query draft");
  firstFrame.scrollTop = 700;
  await user.click(screen.getByRole("button", { name: "another query" }));
  const second = screen.getByRole("textbox", { name: "A draft" });
  expect(second).not.toBe(first);
  const secondFrame = second.closest<HTMLElement>("[data-route-page]")!;
  const order = Array.from(firstFrame.parentElement!.children);
  await user.type(second, "second query draft");
  secondFrame.scrollTop = 350;
  await user.click(screen.getByRole("button", { name: "history back" }));
  expect(screen.getByRole("textbox", { name: "A draft" })).toBe(first);
  expect(first).toHaveProperty("value", "first query draft");
  expect(firstFrame.scrollTop).toBe(700);
  expect(secondFrame.inert).toBe(true);
  expect(Array.from(firstFrame.parentElement!.children)).toEqual(order);
  await user.click(screen.getByRole("button", { name: "history forward" }));
  expect(screen.getByRole("textbox", { name: "A draft" })).toBe(second);
  expect(second).toHaveProperty("value", "second query draft");
  expect(secondFrame.scrollTop).toBe(350);
  expect(mounted).toHaveBeenCalledTimes(2);
});

it("applies a new search selection to a retained URL without remounting the page", async () => {
  const user = userEvent.setup(),
    mounted = vi.fn();
  render(<Fixture mounted={mounted} />);
  const input = screen.getByRole("textbox", { name: "A draft" });
  await user.click(screen.getByRole("button", { name: "/b" }));
  await user.click(screen.getByRole("button", { name: "new search intent" }));
  expect(screen.getByRole("textbox", { name: "A draft" })).toBe(input);
  expect(screen.getByRole("status", { name: "selection" }).textContent).toBe(
    "new selection",
  );
  expect(mounted).toHaveBeenCalledTimes(2);
});

it("keeps portalled dialogs with their page and prevents hidden dialogs consuming Escape", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const user = userEvent.setup();
  render(<Fixture mounted={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "open A draft" }));
  await user.type(
    screen.getByRole("textbox", { name: "modal A draft" }),
    "modal draft",
  );
  await user.click(screen.getByRole("button", { name: "/b" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "/a" }));
  expect(screen.getByRole("textbox", { name: "modal A draft" })).toHaveProperty(
    "value",
    "modal draft",
  );
});
it("discards cached pages and saved destinations when switching accounts", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const user = userEvent.setup();
  render(<Fixture mounted={vi.fn()} />);
  await user.type(
    screen.getByRole("textbox", { name: "A draft" }),
    "first account private draft",
  );
  await user.click(screen.getByRole("button", { name: "/b" }));
  await user.click(screen.getByRole("button", { name: "switch account" }));
  expect(screen.queryByDisplayValue("first account private draft")).toBeNull();
  await user.click(screen.getByRole("button", { name: "/a" }));
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "A draft" })).toHaveProperty(
      "value",
      "",
    ),
  );
  expect(screen.getByLabelText("current url").textContent).toBe("/a");
});
