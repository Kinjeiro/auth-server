describe('[api] health', () => {
  describe('[route] /api/health', () => {
    it('should be valid response', async () => {
      const {
        status,
        text,
      } = await chai.request(server)
        .get('/api/health');

      expect(status).to.equal(200);
      expect(text).to.have.string('@reagentum/auth-server@');
    });
  });
});
