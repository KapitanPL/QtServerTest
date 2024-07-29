#include "CLxSlideScanningServer.h"

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMimeDatabase>
#include <QFile>

SlideScanning::CLxSlideScanningServer::CLxSlideScanningServer(QAbstractListModel* sourceModel, QObject* parent)
   : QObject(parent)
   //, m_pSourceModel(dynamic_cast<SlideModel*>(sourceModel))
{
      m_pSourceModel = new GreatPretender();
     createRoute("/", [this](const QHttpServerRequest& request) {
         return serveStaticFile(request.url().path());
         });

     createRoute("/gnr_slide_scanning/SlideScanning/Explorer/js/", [this](const QString &, const QHttpServerRequest& request) {
        return serveStaticFile(request.url().path());
        });

     createRoute("/gnr_slide_scanning/SlideScanning/Explorer/css/", [this](const QString&, const QHttpServerRequest& request) {
        return serveStaticFile(request.url().path());
        });

     createRoute("/headers", [this](const QHttpServerRequest&) {
        return getHeaders();
     });

     createRoute("/rows", [this](const QHttpServerRequest& request) {
        return getRows(request);
        });

   m_server.listen(QHostAddress::Any, 8080);
}

QHttpServerResponse SlideScanning::CLxSlideScanningServer::serveStaticFile(const QString& path) const {
   QString resourcePath = ":" + path;
   if (path == "/") {
      resourcePath = ":/gnr_slide_scanning/SlideScanning/Explorer/main.html"; // Serve the index.html file for the root path
   }

   QFile file(resourcePath);
   if (file.exists() && file.open(QIODevice::ReadOnly)) {
      QByteArray content = file.readAll();

      QMimeDatabase mimeDatabase;
      QMimeType mimeType = mimeDatabase.mimeTypeForFile(resourcePath);
      QString contentType = mimeType.isValid() ? mimeType.name() : "application/octet-stream";

      return QHttpServerResponse(contentType.toUtf8(), content);
   }
   else {
      //LX_TRACE(L"WARNING Source missing: %s", resourcePath.toStdWString().data());
      return QHttpServerResponse("text/plain", "404 Not Found", QHttpServerResponse::StatusCode::NotFound);
   }
}

QHttpServerResponse SlideScanning::CLxSlideScanningServer::getHeaders() const
{
   QJsonArray headers;
   if (m_pSourceModel)
   {
      auto headerData = m_pSourceModel->roleNames();
      for (auto dta : std::as_const(headerData))
      {
         headers.append(QJsonValue::fromVariant(dta));
      }
   }
   QJsonDocument jsonDoc(headers);
   return QHttpServerResponse("application/json", jsonDoc.toJson());
}

QHttpServerResponse SlideScanning::CLxSlideScanningServer::getRows(const QHttpServerRequest& request) const
{
   const auto query = request.url().query();
   QUrlQuery urlQuery(query);

   QString mainQuery = "";
   QMap<QString, QString> rolesMap;

   const auto queryItems = urlQuery.queryItems();
   for (const auto& item : queryItems) {
      QString key = item.first;
      QString value = QUrl::fromPercentEncoding(item.second.toUtf8()).replace("+", " ");
      if (key == QStringLiteral("queryGroup")) {
         mainQuery = value;
      } else {
         rolesMap[key] = value;
      }
   }

   QJsonArray rows;
   if (m_pSourceModel)
   {
      const auto & roleNames = m_pSourceModel->roleNames();
      QMap<int32_t, QString> intRolesMap = {};
      int32_t mainRole = -1;
      for ( auto key : roleNames.keys()) {
         if( rolesMap.keys().contains(roleNames[key])) {
            intRolesMap[key] = rolesMap[roleNames[key]];
         }
         if (mainQuery.toLower() == roleNames[key].toLower()){
            mainRole = key;
         }
      }
      Q_ASSERT(mainRole != -1);
      QSet<QString> uniqueData;
      for (int row = 0; row < m_pSourceModel->rowCount(); ++row)
      {
         QJsonObject rowObject;
         bool addThisRow = true;
         for (auto role : intRolesMap.keys())
         {
            auto data = m_pSourceModel->data(m_pSourceModel->index(row, 0), role).toString();
            if (data == intRolesMap[role]) {
               rowObject[m_pSourceModel->roleNames().value(role)] = QJsonValue::fromVariant(data);
            } else {
               addThisRow = false;
               break;
            }
         }
         if (addThisRow) {
            auto data = m_pSourceModel->data(m_pSourceModel->index(row, 0), mainRole);
            if(uniqueData.contains(data.toString()) == false)
            {
               rowObject[mainQuery] = QJsonValue::fromVariant(data);
               rowObject[QStringLiteral("rowID")] = row;
               rows.append(rowObject);
            }
            uniqueData.insert(data.toString());
         }
      }
   }

   QJsonDocument jsonDoc(rows);
   return QHttpServerResponse("application/json", jsonDoc.toJson());
}

QUrl SlideScanning::CLxSlideScanningServer::url() const
{
   return QUrl("http://localhost:8080/");
}

bool SlideScanning::CLxSlideScanningServer::createRoute(QString rule, std::function<QHttpServerResponse(const QHttpServerRequest&)> callback)
{
   bool success = m_server.route(rule, callback);
   if (!success)
   {
      //LX_TRACE(L"WARNING Route %s creation failed.", rule);
   }
   return success;
}

bool SlideScanning::CLxSlideScanningServer::createRoute(QString rule, std::function<QHttpServerResponse(const QString & detail,const QHttpServerRequest&)> callback)
{
   bool success = m_server.route(rule, callback);
   if (!success)
   {
      //LX_TRACE(L"WARNING Route %s creation failed.", rule);
   }
   return success;
}
