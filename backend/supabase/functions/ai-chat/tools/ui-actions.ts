import type { RegisteredTool } from "./types.ts";
import { destinations, effects, moods, toastTypes, widgets } from "./types.ts";
import { enumValue, objectArgs, requiredString } from "./validation.ts";

const stringEnum = (values: readonly string[]) => ({ type: "STRING", enum: [...values] });

export const navigateTool: RegisteredTool = {
  declaration: {
    name: "navigate",
    description: "Take the member to a real Wine & Chapters page or section.",
    parameters: {
      type: "OBJECT",
      properties: { destination: stringEnum(destinations) },
      required: ["destination"],
    },
  },
  execute(args) {
    const destination = enumValue(objectArgs(args), "destination", destinations);
    return {
      output: { navigating: true, destination },
      action: { type: "NAVIGATE", destination },
    };
  },
};

export const openWidgetTool: RegisteredTool = {
  declaration: {
    name: "open_widget",
    description: "Open or focus an existing club interface.",
    parameters: {
      type: "OBJECT",
      properties: { widget: stringEnum(widgets) },
      required: ["widget"],
    },
  },
  execute(args) {
    const widget = enumValue(objectArgs(args), "widget", widgets);
    return { output: { opening: true, widget }, action: { type: "OPEN_WIDGET", widget } };
  },
};

export const setMoodTool: RegisteredTool = {
  declaration: {
    name: "set_mood",
    description: "Apply a subtle predefined site mood or restore the default mood.",
    parameters: {
      type: "OBJECT",
      properties: { mood: stringEnum(moods) },
      required: ["mood"],
    },
  },
  execute(args) {
    const mood = enumValue(objectArgs(args), "mood", moods);
    return { output: { applied: true, mood }, action: { type: "SET_MOOD", mood } };
  },
};

export const showToastTool: RegisteredTool = {
  declaration: {
    name: "show_toast",
    description: "Show one short themed notification. Use sparingly and never repeat it.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: { type: "STRING", description: "A concise message, at most 160 characters." },
        type: stringEnum(toastTypes),
      },
      required: ["message", "type"],
    },
  },
  execute(args) {
    const record = objectArgs(args);
    const message = requiredString(record, "message", 1, 160);
    const toastType = enumValue(record, "type", toastTypes);
    return {
      output: { shown: true },
      action: { type: "SHOW_TOAST", message, toastType },
    };
  },
};

export const triggerEffectTool: RegisteredTool = {
  declaration: {
    name: "trigger_effect",
    description: "Trigger one lightweight predefined visual flourish. Use very sparingly.",
    parameters: {
      type: "OBJECT",
      properties: { effect: stringEnum(effects) },
      required: ["effect"],
    },
  },
  execute(args) {
    const effect = enumValue(objectArgs(args), "effect", effects);
    return { output: { triggered: true, effect }, action: { type: "TRIGGER_EFFECT", effect } };
  },
};
