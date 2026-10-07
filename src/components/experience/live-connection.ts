'use client';

type LiveEvent = { type: string; delta?: string; start_ms?: number; end_ms?: number; delegation?: { id: string }; error?: { message?: string } };
type Callbacks = { event: (event: LiveEvent) => void; closed: () => void; error: (message: string) => void; playbackBlocked: () => void };
export class LiveConnection {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private abort = new AbortController();
  private stopped = false;
  private finished = false;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private connectTimer: ReturnType<typeof setTimeout> | undefined;
  private failedTimer: ReturnType<typeof setTimeout> | undefined;
  private rejectStart: ((reason: Error) => void) | undefined;
  constructor(private audio: HTMLAudioElement, private callbacks: Callbacks) {}
  async start(createSession: (sdp: string, signal: AbortSignal) => Promise<{ sdp: string }>) {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('이 브라우저에서는 음성 연결을 지원하지 않아요. HTTPS 또는 localhost에서 Chrome·Safari로 열어 주세요.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (this.stopped) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    const pc = new RTCPeerConnection(); this.peer = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = e => { this.audio.srcObject = e.streams[0] || new MediaStream([e.track]); this.audio.play().catch(() => this.callbacks.playbackBlocked()); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { this.callbacks.error('음성 연결이 끊겼어요. 답변은 저장되어 있으니 다시 연결해 주세요.'); this.finish(); }
      if (pc.connectionState === 'disconnected') this.failedTimer = setTimeout(() => { if (pc.connectionState === 'disconnected') { this.callbacks.error('연결이 불안정해 종료했어요. 다시 연결해 이어갈 수 있어요.'); this.finish(); } }, 10000);
      if (pc.connectionState === 'connected') clearTimeout(this.failedTimer);
    };
    const channel = pc.createDataChannel('oai-events'); this.channel = channel;
    const started = new Promise<void>((resolve, reject) => {
      this.rejectStart = reject;
      this.connectTimer = setTimeout(() => reject(new Error('음성 연결 시간이 초과됐어요. 다시 연결해 주세요.')), 35000);
      channel.onmessage = message => {
        let event: LiveEvent; try { event = JSON.parse(message.data); } catch { return; }
        if (event.type === 'session.started') { clearTimeout(this.connectTimer); this.rejectStart = undefined; resolve(); }
        if (event.type === 'session.closed') { this.finish(); return; }
        if (event.type === 'error') this.callbacks.error('음성 요청을 처리하지 못했어요. 연결을 다시 시작하거나 글로 답해 주세요.');
        this.callbacks.event(event);
      };
      channel.onclose = () => this.finish();
    });
    // Attach a rejection handler before awaiting SDP/network work.
    void started.catch(() => {});
    try {
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { cleanup(); reject(new Error('네트워크 연결 정보를 준비하지 못했어요.')); }, 12000);
        const changed = () => { if (pc.iceGatheringState === 'complete') { cleanup(); resolve(); } };
        const cleanup = () => { clearTimeout(timeout); pc.removeEventListener('icegatheringstatechange', changed); };
        pc.addEventListener('icegatheringstatechange', changed);
      });
      if (this.stopped) return;
      const result = await createSession(pc.localDescription!.sdp, this.abort.signal);
      if (this.stopped) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });
      await started;
    } catch (error) { this.finish(); throw error; }
  }
  send(type: 'session.instructions.append' | 'session.thinking.append' | 'session.commentary.append', content: string, delegationId: string | null = null) {
    if (this.channel?.readyState !== 'open' || this.stopped) return;
    this.channel.send(JSON.stringify({ type, event_id: crypto.randomUUID(), delegation_id: delegationId, content }));
  }
  mute(muted: boolean) { this.stream?.getAudioTracks().forEach(t => { t.enabled = !muted; }); }
  close() {
    if (this.stopped) return;
    this.stopped = true; this.abort.abort();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audio.pause();
    if (this.channel?.readyState === 'open') {
      this.channel.send(JSON.stringify({ type: 'session.close', event_id: crypto.randomUUID() }));
      this.closeTimer = setTimeout(() => this.finish(), 2000);
    } else this.finish();
  }
  private finish() {
    if (this.finished) return; this.finished = true; this.stopped = true;
    clearTimeout(this.closeTimer); clearTimeout(this.connectTimer); clearTimeout(this.failedTimer);
    this.abort.abort(); this.rejectStart?.(new Error('음성 연결이 종료됐어요.')); this.rejectStart = undefined;
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    this.channel?.close(); this.peer?.close(); this.audio.pause(); this.audio.srcObject = null;
    this.callbacks.closed();
  }
}
