import { AppShell } from "../../../../components/layout/app-shell";
import { ApplicationHeader } from "../../../../components/layout/application-header";
import { PageContainer } from "../../../../components/layout/page-container";
import { DesktopSidebar } from "../../../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../../../components/navigation/mobile-navigation";
import { EditSessionView } from "../../../../features/sessions/components/edit-session-view";

type EditSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function EditSessionPage({
  params,
}: EditSessionPageProps) {
  const { sessionId } = await params;

  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Edit Session"
          description="Update the activity, schedule, venue, or note."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <EditSessionView sessionId={sessionId} />
      </PageContainer>
    </AppShell>
  );
}
