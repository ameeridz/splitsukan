import { AppShell } from "../../../components/layout/app-shell";
import { ApplicationHeader } from "../../../components/layout/application-header";
import { PageContainer } from "../../../components/layout/page-container";
import { DesktopSidebar } from "../../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../../components/navigation/mobile-navigation";
import { SessionBalanceSummary } from "../../../features/balances/components/session-balance-summary";
import { ExpenseManager } from "../../../features/expenses/components/expense-manager";
import { SessionExpenseSummary } from "../../../features/expenses/components/session-expense-summary";
import { ParticipantManager } from "../../../features/participants/components/participant-manager";
import { RepaymentManager } from "../../../features/repayments/components/repayment-manager";
import { SessionDetailView } from "../../../features/sessions/components/session-detail-view";

type SessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Session Overview"
          description="Review participants, expenses, balances, and repayments."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <div className="space-y-6">
          <SessionDetailView sessionId={sessionId} />
          <SessionExpenseSummary sessionId={sessionId} />
          <ParticipantManager sessionId={sessionId} />
          <ExpenseManager sessionId={sessionId} />
          <SessionBalanceSummary sessionId={sessionId} />
          <RepaymentManager sessionId={sessionId} />
        </div>
      </PageContainer>
    </AppShell>
  );
}
