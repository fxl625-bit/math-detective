import { redirect } from 'next/navigation';

/** Legacy deep link: keep the active daily lesson as the single learning entry. */
export default function NoiseReductionPage() {
  redirect('/play');
}
