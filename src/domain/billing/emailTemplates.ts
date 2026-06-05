/**
 * Kumpulan template email HTML sederhana dan responsif untuk sistem billing.
 */

export const emailTemplates = {
    welcome_trial: (tenantName: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Selamat Datang di Church Management System!</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Terima kasih telah mendaftarkan gereja Anda. Akun Anda telah berhasil dibuat dengan paket <strong>Free Trial 14 hari</strong>.</p>
            <p>Selama masa trial ini, Anda dapat mengeksplorasi semua fitur premium kami untuk membantu pengelolaan gereja Anda menjadi lebih efektif.</p>
            <p>Jika ada pertanyaan, jangan ragu untuk membalas email ini.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    invoice_created: (tenantName: string, planName: string, amount: string, dueDate: string, paymentUrl?: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Tagihan Baru Diterbitkan</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Tagihan baru untuk langganan Anda telah diterbitkan:</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Paket</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${planName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Jumlah</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${amount}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Jatuh Tempo</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${dueDate}</td>
                </tr>
            </table>
            ${paymentUrl ? `
            <div style="margin-top: 20px;">
                <a href="${paymentUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Bayar Sekarang</a>
            </div>
            <p style="font-size: 0.9em; color: #666; margin-top: 20px;">Atau klik link berikut: <br> <a href="${paymentUrl}">${paymentUrl}</a></p>
            ` : '<p>Silakan hubungi administrator untuk melakukan pembayaran.</p>'}
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    payment_success: (tenantName: string, amount: string, paidAt: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #16a34a;">Pembayaran Berhasil</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Terima kasih, pembayaran Anda sebesar <strong>${amount}</strong> telah kami terima pada tanggal <strong>${paidAt}</strong>.</p>
            <p>Langganan Anda telah diperbarui secara otomatis. Anda dapat terus menggunakan semua fitur sesuai paket Anda.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    payment_failed: (tenantName: string, amount: string, gracePeriodDays: number) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #dc2626;">Pembayaran Gagal</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Kami memberitahukan bahwa upaya pembayaran untuk tagihan sebesar <strong>${amount}</strong> telah gagal atau kadaluarsa.</p>
            <p>Anda memiliki waktu <strong>${gracePeriodDays} hari</strong> masa tenggang (grace period) untuk menyelesaikan pembayaran sebelum akses fitur premium ditangguhkan.</p>
            <p>Silakan kunjungi dashboard billing untuk melakukan pembayaran ulang.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    subscription_suspended: (tenantName: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #dc2626;">Akses Ditangguhkan</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Kami menyesal menginformasikan bahwa akses ke fitur premium Church Management System Anda telah ditangguhkan karena masa tenggang pembayaran telah berakhir.</p>
            <p>Untuk mengaktifkan kembali akun Anda, silakan segera selesaikan pembayaran yang tertunggak melalui dashboard billing.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    trial_ending_reminder: (tenantName: string, endsAt: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ca8a04;">Masa Trial Segera Berakhir</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Masa Free Trial Anda akan berakhir pada tanggal <strong>${endsAt}</strong>.</p>
            <p>Agar tetap dapat menggunakan fitur-fitur premium setelah masa trial berakhir, silakan pilih paket berlangganan melalui dashboard billing Anda.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    downgrade_scheduled: (tenantName: string, oldPlan: string, newPlan: string, effectiveAt: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Konfirmasi Downgrade Terjadwal</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Kami telah menerima permintaan Anda untuk mengubah paket dari <strong>${oldPlan}</strong> ke <strong>${newPlan}</strong>.</p>
            <p>Perubahan ini akan efektif mulai tanggal <strong>${effectiveAt}</strong> (akhir periode langganan saat ini).</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `,

    subscription_cancelled: (tenantName: string, effectiveAt: string) => `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4b5563;">Konfirmasi Pembatalan Langganan</h2>
            <p>Halo <strong>${tenantName}</strong>,</p>
            <p>Langganan berbayar Anda telah dibatalkan atas permintaan Anda. Anda masih dapat menikmati fitur premium hingga masa berakhir pada <strong>${effectiveAt}</strong>.</p>
            <p>Setelah tanggal tersebut, akun Anda akan otomatis beralih ke paket <strong>Free</strong>.</p>
            <p>Terima kasih,<br>Tim CMS</p>
        </div>
    `
};
