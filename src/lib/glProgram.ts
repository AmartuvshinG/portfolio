/**
 * Compile and link a WebGL program without blocking the main thread on it.
 *
 * A shader compile is cheap to *issue* and expensive to *wait for*: the first
 * status query (`COMPILE_STATUS`, `LINK_STATUS`, even `getUniformLocation`)
 * stalls until the driver is done. Measured at 4× CPU on GPU Chromium, the
 * ink intro's link stalled 354 ms during the preloader and the globe's two
 * links 59 ms as Journey arrived.
 *
 * With `KHR_parallel_shader_compile` (Safari, Chrome on a GPU) the driver
 * works on its own thread and `COMPLETION_STATUS_KHR` is a free poll, so this
 * polls once a frame and only then checks the result. Without the extension
 * the result is checked at once, which is the old synchronous behaviour.
 *
 * Resolves to null on a compile or link failure (logged under `tag`) or if
 * the context is lost while waiting.
 */
export async function linkProgram(
  gl: WebGLRenderingContext,
  vert: string,
  frag: string,
  tag: string,
  /** Attribute locations to bind before the link. */
  attribs: Record<string, number> = {}
): Promise<WebGLProgram | null> {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  for (const [name, at] of Object.entries(attribs)) gl.bindAttribLocation(p, at, name);
  gl.linkProgram(p);

  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (parallel) {
    while (!gl.isContextLost() && !gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR)) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
  if (gl.isContextLost()) return null;

  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return p;
  for (const sh of [vs, fs]) {
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn(`[${tag}] shader:`, gl.getShaderInfoLog(sh));
  }
  console.warn(`[${tag}] link:`, gl.getProgramInfoLog(p));
  return null;
}
