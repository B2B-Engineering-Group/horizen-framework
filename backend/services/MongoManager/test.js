import express from "express";
import {expect} from "chai";
import { Blob } from "buffer";

export default Test;

function Test({db, Validator, mongoManager}) {
	const gfs = mongoManager.gfs;

	it(`Вставить/Забрать файл из GridFs [Blob]`, async ()=> { 
		const filename = await gfs.insertFile({
			blob: new Blob(["test1"], {type: "text"}),
			metadata: {isMeta: true}
		});
		const file = await gfs.getFile({filename});

		expect(file.metadata.isMeta).to.be.equal(true);
		expect(file.blob.type).to.be.equal("text");
		expect(await file.blob.text()).to.be.equal("test1");
	});
}
