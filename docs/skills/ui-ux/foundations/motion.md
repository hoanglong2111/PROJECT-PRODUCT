# Motion Foundation

Use motion to clarify state changes, not to decorate operational screens.

## Default Motion

- Use subtle hover feedback on table rows and action buttons.
- Use normal Drawer/Modal transitions from Mantine.
- Use Progress animation only when it represents changing task/milestone completion.
- Use Skeletons for loading lists and detail panes.
- Keep focus outlines visible.

## Avoid

- Decorative background motion.
- Continuous animations on dense work pages.
- Pulsing risk badges unless there is a truly urgent live condition.
- Long easing that delays operational work.

## Module Motion

Dashboard:

- metric updates can fade/settle lightly.

Workflow:

- focused entity rows may highlight briefly when deep-linked.

Shipment:

- milestone transition feedback can be subtle in the detail header.

Tasks:

- progress changes may animate the progress bar.

## Accessibility

Respect reduced motion preferences when adding custom motion. Never require animation to understand state.
