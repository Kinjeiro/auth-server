import sendMail from './mail-helper';

describe('[helper] mail-helper', function anon() {
  // Timeout of 2000ms exceeded. For async tests and hooks, ensure "done()"
  // Увеличиваем таймаут, но нужно не делать стрелочную функцию чтобы был контекст
  this.timeout(50000);

  it('should send mail', async () => {
    const message = await sendMail(
      'kinjeiro@gmail.com',
      'Test Subject',
      '<b>OPA</b>',
    );

    expect(message.to).to.equal('kinjeiro@gmail.com');
    expect(message.html).to.equal('<b>OPA</b>');
  });
});
