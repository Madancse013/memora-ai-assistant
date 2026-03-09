import { EmptyState } from "@/components/ui/states";
import { CreditCard } from "lucide-react";

const Billing = () => {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6">Billing & Usage</h1>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-2">Current Plan</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Free Tier
          </span>
          <span className="text-sm text-muted-foreground">Phase 1 Beta</span>
        </div>
      </div>

      <EmptyState
        icon={CreditCard}
        title="Stripe integration coming soon"
        description="Plan management and billing will be available in Phase 2."
      />
    </div>
  );
};

export default Billing;
