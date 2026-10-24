/* Runs the model off the main thread so the page never freezes. */
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
let generator = null;

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try {
      const files = {};
      generator = await pipeline("text-generation", MODEL, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback: p => {
          if (p.status !== "progress" || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          const vals = Object.values(files);
          const loaded = vals.reduce((a, v) => a + v[0], 0);
          const total = vals.reduce((a, v) => a + v[1], 0);
          self.postMessage({ type: "progress", value: Math.min(99, Math.round((loaded / total) * 100)) });
        }
      });
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  } else if (data.type === "ask") {
    try {
      const out = await generator(data.messages, {
        max_new_tokens: 80,
        do_sample: false,
        repetition_penalty: 1.1
      });
      self.postMessage({ type: "answer", id: data.id, text: String(out[0].generated_text.at(-1).content).trim() });
    } catch (err) {
      self.postMessage({ type: "answer", id: data.id, error: String(err) });
    }
  }
};
