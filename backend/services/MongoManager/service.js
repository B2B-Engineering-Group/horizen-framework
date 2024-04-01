import mongodb from "mongodb";
import multer from 'multer';
import stream from 'stream';
import crypto from "crypto";
import { Blob } from "buffer";
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-to-extensions';
import ObjectId from "bson-objectid";

const {MongoClient} = mongodb;

export default MongoManager;

/**
 * Сахар для работы с MongoDB. Стандартизирует единый драйвер для всех сервисов, 
 * обеспечивает унифицированный и простой механизм для работы с GridFs.
 **/
function MongoManager({config}){
	let self = this;

	self.ObjectId = ObjectId;
	self.init = init;

	async function getFile(toFind){
        const file = (await self.gfs.bucket.find(toFind).toArray())[0];
  
        if(file){
            file.blob = await getFileBlob(file._id);

            return file;
        } else {
            return null;
        }
        
        function getFileBlob(_id){
            return new Promise(function(resolve, reject){
                const stream = self.gfs.bucket.openDownloadStream(_id)
                const buffer = [];

                stream.on('data', data => {
                    buffer.push(data);
                });

                stream.on('end', () => {
                    resolve(new Blob([Buffer.concat(buffer)], {type: file.contentType}));
                });

                stream.on('error', reject);
            });
        };
    }

    async function insertFile({blob, metadata = {}}){
        return new Promise(async (resolve, reject) => {
            const filename = uuidv4();
            const readStream = new stream.Readable();
            const extension = mime.extension(blob.type);
            const buffer = Buffer.from(await blob.arrayBuffer());
            const writeStream = self.gfs.bucket.openUploadStream(filename, {
                contentType: blob.type,
                metadata: {
                    ...metadata,
                    created: Date.now(),
                    extension: extension || "",
                    md5: crypto.createHash('md5').update(buffer).digest("base64")
                }
            });

            readStream.push(buffer);
            readStream.push(null);
            readStream.pipe(writeStream);

            writeStream.on('finish', () => resolve(filename));
            writeStream.on('error', reject);
        });
    }

	function init(){
		return new Promise(async function(resolve, reject){
			let url = config.mongodb.host;
			
			console.log("Connectig to MongoDB...");
			const client = new MongoClient(url, { useUnifiedTopology: true}, { useNewUrlParser: true }, { connectTimeoutMS: 30000 }, { keepAlive: 1});
			const db = client.db();

			self.db = db;
			self.client = client;
			self.dbTransaction = dbTransaction;
			self.setIndex = setIndexRequired;
			self.gfs = { getFile, insertFile, bucket: new mongodb.GridFSBucket(db)};

			client.on('topologyClosed', function(event) {
			  	console.log('received topologyClosed', event);
				process.exit(-1);
			});

			console.log("Connected to MongoDB");
			resolve(db);

			/**
			 * Транзакции для атомарной работы с разными коллекциями/документами (только внутри репликасета)
			 * 
			 * 	await doTransaction(async (session) => {
			 *		await db("withdrawals").insertOne(
			 *			{accountId: "9876", amount: -100}, 
			 *			{ session }
			 * 		);
			 *
			 *		await db("balances").findOneAndUpdate(
			 *			{account_id: "9879"}, 
			 *			{$inc: {amount: 100 }}, 
			 *			{ session }
			 *		);
			 *  });
			 **/
			async function dbTransaction(callback) {
				const session = client.startSession();

				try {
					session.startTransaction();
					await callback(session);
				 	await session.commitTransaction();
				} catch (error){
				  	await session.abortTransaction();
				  	throw new Error(error);
				} finally {
				  	await session.endSession();
				}
			}

			function setIndexRequired(toIndex){
				setIndexes(db, toIndex).then(()=> {
					console.log(`Added unique indexes: ${JSON.stringify(toIndex)}`);
					resolve(db)
				}, (err)=> {
					console.log(`DB is not indexed`, err);
					process.exit(1);
				});
			}
		});
		
		async function setIndexes(db, toIndex){
			for(let collectionName in toIndex){
				const collection = db.collection(collectionName);

				for(let intersection of toIndex[collectionName]){
					await collection.createIndex(intersection[0], intersection[1]);
				}
			}
		}
	}
}