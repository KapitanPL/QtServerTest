#include <QCoreApplication>
#include <QSharedPointer>
#include "CLxSlideScanningServer.h"

int main(int argc, char *argv[])
{
   qputenv("QTWEBENGINE_REMOTE_DEBUGGING", "9222"); // TODO disable when committing
   QCoreApplication app(argc, argv);

   QSharedPointer<GreatPretender> pretender = QSharedPointer<GreatPretender>(new GreatPretender);
   SlideScanning::CLxSlideScanningServer server(pretender);

   // Connect server signals to slots if needed to ensure proper functioning

   return app.exec(); // Start the event loop
}
