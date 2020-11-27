const backoff = require('./backoff');

describe('exponential-backoff', () => {
  it('should retry the correct amount of times', async () => {
    const val = 1;
    const err = new Error();
    const strategy = sinon.fake.returns(0);
    const fn = sinon.stub()
      .onFirstCall()
      .rejects(err)
      .onSecondCall()
      .resolves(val);
    const onError = sinon.fake();

    const result = await backoff(fn, { maxRetries: 1, onError, strategy });
    expect(result).to.equal(val);
    expect(onError).to.have.been.calledOnceWith(err);
    expect(strategy).to.have.been.calledOnceWith({ attemptNumber: 1, error: err });
  });

  it('should throw when over the max amount of retries', async () => {
    const err = new Error();
    const strategy = sinon.fake.returns(0);
    const fn = sinon.stub().rejects(err);
    const onError = sinon.fake();

    await expect(backoff(fn, { maxRetries: 1, onError, strategy })).to.be.rejected;
    expect(fn).to.have.been.calledTwice;
    expect(onError).to.have.been.calledTwice;
    expect(onError).to.have.been.calledWith(err);
    expect(strategy).to.have.been.calledOnceWith({ attemptNumber: 1, error: err });
  });
});
