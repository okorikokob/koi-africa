import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

type Step = { title: string; description: string };

export function ProcessList({ steps }: { steps: Step[] }) {
  return (
    <StaggerGrid className="mx-auto flex max-w-[820px] flex-col">
      {steps.map((step, i) => (
        <StaggerItem key={step.title}>
          <div className="flex gap-4 border-b border-border py-4 last:border-none">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary font-sans text-[13px] font-extrabold text-primary-foreground">
              {i + 1}
            </div>
            <div>
              <div className="mb-0.5 font-sans text-sm font-extrabold text-text-primary">
                {step.title}
              </div>
              <div className="font-sans text-[13px] leading-[1.55] text-text-secondary">
                {step.description}
              </div>
            </div>
          </div>
        </StaggerItem>
      ))}
    </StaggerGrid>
  );
}
