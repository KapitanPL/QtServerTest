#pragma once
#include <QHttpServer>
#include <qobject.h>

#include <QAbstractListModel>
#include <QFile>

class GreatPretender : public QAbstractListModel
{
public:
   QList<QList<QVariant>> fakeData;

   GreatPretender(QObject* parent = nullptr)
       : QAbstractListModel(parent)
   {
      loadDataFromFile(":/dataShort.txt");
   }

   virtual QHash<int, QByteArray> roleNames() const override {
      QHash<int, QByteArray> roles;
      roles[Qt::UserRole + 1] = "UserG";
      roles[Qt::UserRole + 2] = "Tissue";
      roles[Qt::UserRole + 3] = "Staining";
      roles[Qt::UserRole + 4] = "Project";
      roles[Qt::UserRole + 5] = "Date";
      return roles;
   }

   int rowCount(const QModelIndex& parent = QModelIndex()) const override
   {
      return fakeData.length();
   }

   QVariant data(const QModelIndex& index, int role = Qt::DisplayRole) const override
   {
      if (role > Qt::UserRole)
         return fakeData[index.row()][role - Qt::UserRole - 1];
      return QVariant();
   }

private:
   void loadDataFromFile(const QString& fileName)
   {
      QFile file(fileName);
      if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
         qWarning() << "Unable to open file" << fileName;
         return;
      }

      QTextStream in(&file);
      while (!in.atEnd()) {
         QString line = in.readLine();
         QStringList fields = line.split(',');

         if (fields.size() == 5) {
            QList<QVariant> row;
            row.append(fields[0]);
            row.append(fields[2]);
            row.append(fields[3]);
            row.append(fields[4]);
            row.append(QDate::fromString(fields[1], "yyyy-MM-dd"));
            fakeData.append(row);
         }
      }

      file.close();
   }
};

namespace SlideScanning {
class SlideModel;

class CLxSlideScanningServer :
                               public QObject
{
   Q_OBJECT;
   Q_PROPERTY(QUrl url READ url)
public:
   CLxSlideScanningServer(QSharedPointer<QAbstractListModel> sourceModel, QObject* parent = nullptr);
   virtual ~CLxSlideScanningServer() = default;

protected:
   virtual QHttpServerResponse serveStaticFile(const QString& path) const;
   virtual QHttpServerResponse getHeaders() const;
   virtual QHttpServerResponse getRows(const QHttpServerRequest& request) const;
   virtual QUrl url() const;

   bool  createRoute(QString rule, std::function<QHttpServerResponse(const QHttpServerRequest&)> callback);
   bool  createRoute(QString rule, std::function<QHttpServerResponse(const QString&, const QHttpServerRequest&)> callback);

private:
   QHttpServer m_server;
   QWeakPointer<QAbstractListModel> m_pSourceModel;
};

} // namespace SlideScanning
