#include "CLxSlideScanningServer.h"

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMimeDatabase>
#include <QFile>

SlideScanning::CLxSlideScanningServer::CLxSlideScanningServer(QSharedPointer<QAbstractListModel> sourceModel, QObject* parent)
    : QObject(parent)
    , m_pSourceModel(sourceModel)
{
   createRoute("/", [this](const QHttpServerRequest& request) {
      return serveStaticFile(request.url().path());
   });

   createRoute("/gnr_slide_scanning/SlideScanning/Explorer/js/", [this](const QString&, const QHttpServerRequest& request) {
      return serveStaticFile(request.url().path());
   });

   createRoute("/gnr_slide_scanning/SlideScanning/Explorer/css/", [this](const QString&, const QHttpServerRequest& request) {
      return serveStaticFile(request.url().path());
   });

   createRoute("/gnr_slide_scanning/SlideScanning/Explorer/skin-lion/", [this](const QString&, const QHttpServerRequest& request) {
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
   auto sourceModel = m_pSourceModel.toStrongRef();
   QJsonArray headers;
   if (sourceModel.isNull() == false)
   {
      auto headerData = sourceModel->roleNames();
      auto headerKeys = headerData.keys();
      std::sort(headerKeys.begin(), headerKeys.end());
      for (auto headerKey : headerKeys)
      {
         headers.append(QJsonValue::fromVariant(headerData[headerKey]));
      }
   }
   QJsonDocument jsonDoc(headers);
   return QHttpServerResponse("application/json", jsonDoc.toJson());
}

QHttpServerResponse SlideScanning::CLxSlideScanningServer::getRows(const QHttpServerRequest& request) const
{
   auto sourceModel = m_pSourceModel.toStrongRef();
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
      }
      else {
         rolesMap[key] = value;
      }
   }

   QJsonArray rows;
   if (sourceModel.isNull() == false)
   {
      const auto& roleNames = sourceModel->roleNames();
      QMap<int32_t, QString> intRolesMap = {};
      int32_t mainRole = -1;
      for (auto key : roleNames.keys()) {
         if (rolesMap.keys().contains(roleNames[key])) {
            intRolesMap[key] = rolesMap[roleNames[key]];
         }
         if (mainQuery.toLower() == roleNames[key].toLower()) {
            mainRole = key;
         }
      }
      Q_ASSERT(mainRole != -1);
      QSet<QString> uniqueData;
      for (int row = 0; row < sourceModel->rowCount(); ++row)
      {
         QJsonObject rowObject;
         bool addThisRow = true;
         for (auto role : intRolesMap.keys())
         {
            auto data = sourceModel->data(sourceModel->index(row, 0), role).toString();
            if (data == intRolesMap[role]) {
               rowObject[sourceModel->roleNames().value(role)] = QJsonValue::fromVariant(data);
            }
            else {
               addThisRow = false;
               break;
            }
         }
         if (addThisRow) {
            auto data = sourceModel->data(sourceModel->index(row, 0), mainRole);
            if (uniqueData.contains(data.toString()) == false)
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

bool SlideScanning::CLxSlideScanningServer::createRoute(QString rule, std::function<QHttpServerResponse(const QString& detail, const QHttpServerRequest&)> callback)
{
   bool success = m_server.route(rule, callback);
   if (!success)
   {
      //LX_TRACE(L"WARNING Route %s creation failed.", rule);
   }
   return success;
}

