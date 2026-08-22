import { AppShell } from "../components/layout/app-shell";
import { ApplicationHeader } from "../components/layout/application-header";
import { PageContainer } from "../components/layout/page-container";
import { DesktopSidebar } from "../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../components/navigation/mobile-navigation";
import { SessionsOverview } from "../features/sessions/components/sessions-overview";

export default function Home() {
  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Sessions"
          description="Manage your sports expenses fairly."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="wide">
        <SessionsOverview />
      </PageContainer>
    </AppShell>
  );
}
