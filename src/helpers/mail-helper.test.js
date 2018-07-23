import sendMail from './mail-helper';

describe('[helper] mail-helper', () => {
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
