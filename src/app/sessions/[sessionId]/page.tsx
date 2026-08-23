import { AppShell } from "../../../components/layout/app-shell";
import { ApplicationHeader } from "../../../components/layout/application-header";
import { PageContainer } from "../../../components/layout/page-container";
import { DesktopSidebar } from "../../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../../components/navigation/mobile-navigation";
import { ExpenseManager } from "../../../features/expenses/components/expense-manager";
import { SessionExpenseSummary } from "../../../features/expenses/components/session-expense-summary";
import { ParticipantManager } from "../../../features/participants/components/participant-manager";
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
          description="Review participants and shared session costs."
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
        </div>
      </PageContainer>
    </AppShell>
  );
}
