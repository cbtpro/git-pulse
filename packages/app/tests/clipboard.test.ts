import { afterEach, expect, it, vi } from "vitest";
import { copyText } from "../src/utils/clipboard";
const originalExecCommand = Object.getOwnPropertyDescriptor(
  document,
  "execCommand",
);
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalExecCommand)
    Object.defineProperty(document, "execCommand", originalExecCommand);
  else delete (document as Partial<Document>).execCommand;
  document.body.innerHTML = "";
});

it("uses the web clipboard directly without creating a selection", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await copyText("ABCD-EFGH");
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText).toHaveBeenCalledWith("ABCD-EFGH");
  expect(document.querySelector("textarea")).toBeNull();
});

it.each([true, false])(
  "cleans up the older WebView fallback and restores focus when copying returns %s",
  async (success) => {
    vi.stubGlobal("navigator", {});
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const execCommand = vi.fn(() => {
      expect((document.activeElement as HTMLTextAreaElement).value).toBe(
        "ABCD-EFGH",
      );
      return success;
    });
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      configurable: true,
    });
    if (success) await copyText("ABCD-EFGH");
    else await expect(copyText("ABCD-EFGH")).rejects.toThrow();
    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.activeElement).toBe(button);
    expect(document.querySelector("textarea")).toBeNull();
  },
);
