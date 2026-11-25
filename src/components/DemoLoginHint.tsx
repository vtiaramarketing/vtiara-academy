import { Notice } from './ui';
import { DEMO_OTP, DEMO_PASSWORD } from '@/lib/demoBackend';

/** Demo-mode only (VITE_DEMO_MODE=true). Never rendered or bundled in production builds. */
export default function DemoLoginHint() {
  return <div className="mt-4"><Notice title="Demo mode">Try <code>learner@vtiara.demo</code> / <code>{DEMO_PASSWORD}</code>. Mobile OTP code is <code>{DEMO_OTP}</code>. Use the “Demo mode” button (bottom-left) to switch roles.</Notice></div>;
}
