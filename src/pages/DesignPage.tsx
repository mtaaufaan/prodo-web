// Design system reference page (S0-23). Renders every token from
// docs/design.md so it can be checked visually against the source spec,
// plus a sample of the shadcn/ui components those tokens now theme.
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 border border-line ${className}`} />
      <code className="font-mono text-xs text-text-dim">{name}</code>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-bg-deep px-8 py-10 text-text-bone">
      <div className="mx-auto max-w-5xl space-y-12">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim">
            PRODO / Design System
          </p>
          <h1 className="mt-1 font-sans text-3xl font-extrabold tracking-tight">
            Design Tokens (S0-23)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Reference render of every token in{' '}
            <code className="font-mono text-text-dim">docs/design.md</code> —
            compare visually against the spec, not a pixel-perfect prototype.
          </p>
        </header>

        <Separator className="bg-line" />

        <Section title="Surfaces">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="bg-deep" className="bg-bg-deep" />
            <Swatch name="panel" className="bg-panel" />
            <Swatch name="content" className="bg-content" />
            <Swatch name="raised" className="bg-raised" />
            <Swatch name="raised/2" className="bg-raised-2" />
            <Swatch name="input" className="bg-input-bg" />
            <Swatch name="accent/wash" className="bg-accent-wash" />
          </div>
        </Section>

        <Section title="Hairlines">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="line" className="bg-line" />
            <Swatch name="line/strong" className="bg-line-strong" />
            <Swatch name="line/subtle" className="bg-line-subtle" />
          </div>
        </Section>

        <Section title="Text">
          <div className="space-y-2">
            <p className="text-text-bone">text/bone — primary text, headings</p>
            <p className="text-text-body">text/body — card titles, body</p>
            <p className="text-text-muted">text/muted — secondary</p>
            <p className="text-text-dim">text/dim — labels, captions</p>
            <p className="text-text-faint">text/faint — hints, disabled</p>
          </div>
        </Section>

        <Section title="Signal & Status">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="signal (accent)" className="bg-signal" />
            <Swatch name="signal/hover" className="bg-signal-hover" />
            <Swatch name="mint — DONE" className="bg-mint" />
            <Swatch name="violet — REVIEW" className="bg-violet" />
            <Swatch name="amber — AT RISK" className="bg-amber" />
            <Swatch name="red — BLOCKED" className="bg-red" />
            <Swatch name="blue — info" className="bg-blue" />
            <Swatch name="grey — BACKLOG" className="bg-grey" />
          </div>
        </Section>

        <Section title="Avatars">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-avatar-rd font-mono text-xs font-semibold text-bg-deep">
              RD
            </div>
            <div className="flex h-10 w-10 items-center justify-center bg-mint font-mono text-xs font-semibold text-bg-deep">
              SN
            </div>
            <div className="flex h-10 w-10 items-center justify-center bg-violet font-mono text-xs font-semibold text-bg-deep">
              AK
            </div>
            <div className="flex h-10 w-10 items-center justify-center bg-signal font-mono text-xs font-semibold text-bg-deep">
              MT
            </div>
          </div>
        </Section>

        <Section title="Platform Admin (separate namespace)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="pa/bg" className="bg-pa-bg" />
            <Swatch name="pa/header" className="bg-pa-header" />
            <Swatch name="pa/border" className="bg-pa-border" />
            <Swatch name="pa/accent" className="bg-pa-accent" />
            <Swatch name="pa/accent-hover" className="bg-pa-accent-hover" />
            <Swatch name="pa/step-active" className="bg-pa-step-active" />
          </div>
        </Section>

        <Separator className="bg-line" />

        <Section title="Typography — Archivo (sans)">
          <div className="space-y-2 font-sans">
            <p className="text-3xl font-extrabold tracking-tight">
              800 — Page / panel titles
            </p>
            <p className="text-xl font-bold">700 — Emphasis</p>
            <p className="text-base font-semibold">600 — Subheading</p>
            <p className="text-base font-medium">500 — Medium</p>
            <p className="text-sm">
              400 — Body copy, 13–14px, line-height 1.5–1.6
            </p>
          </div>
        </Section>

        <Section title="Typography — IBM Plex Mono (mono)">
          <div className="space-y-2 font-mono">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
              600 — Eyebrow / section label, uppercase, tracked
            </p>
            <p className="text-sm font-medium">500 — TSK-B203 · 142ms</p>
            <p className="text-sm font-normal">400 — SPRINT 2</p>
          </div>
        </Section>

        <Separator className="bg-line" />

        <Section title="shadcn/ui components (themed)">
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>

          <Card className="max-w-sm border-line bg-raised">
            <CardHeader>
              <CardTitle className="font-mono text-xs uppercase tracking-[0.15em] text-text-dim">
                TSK-B203
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-body">
                Board card surface — uses `raised` background and `line`
                border, per §6 Component Vocabulary.
              </p>
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  )
}
