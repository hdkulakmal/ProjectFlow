// Runs `work(session)` inside a MongoDB transaction when the server supports it
// (MongoDB Atlas always does). A standalone local mongod does not support
// transactions; in that case the work runs once without a session and the
// result reports atomic: false so callers can say so.
const mongoose = require("mongoose");

const isTransactionUnsupported = (error) =>
  error &&
  (error.code === 20 ||
    /Transaction numbers are only allowed|replica set|does not support transactions/i.test(
      error.message || ""
    ));

const runAtomic = async (work) => {
  let session;
  try {
    session = await mongoose.startSession();
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
  }

  if (session) {
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return { result, atomic: true };
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;
      // The very first operation failed because transactions are unavailable,
      // so nothing was written. Fall through and run without a session.
    } finally {
      await session.endSession();
    }
  }

  const result = await work(undefined);
  return { result, atomic: false };
};

module.exports = { runAtomic, isTransactionUnsupported };
